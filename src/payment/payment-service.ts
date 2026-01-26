import type { PaymentGateway, PaymentOrder } from "./payment-types";
import type { OrderService } from "../order/order-service";

export class PaymentService {
    constructor(
        private gateway: PaymentGateway,
        private orderService: OrderService
    ) {}

    async initiatePayment(
        orderId: string,
        currency: string = "INR",
        idempotencyKey?: string
    ): Promise<PaymentOrder> {
        // Get order details
        const order = await this.orderService.getById(orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        if (order.paymentStatus === "paid") {
            throw new Error("Order already paid");
        }

        // Convert to smallest currency unit (paise for INR)
        const amountInSmallestUnit = Math.round(order.total * 100);

        const createOrderRequest: Parameters<
            typeof this.gateway.createOrder
        >[0] = {
            amount: amountInSmallestUnit,
            currency,
            orderId: orderId,
            receipt: `receipt_${orderId}`,
            notes: {
                orderId: orderId,
                customerId: order.customerId,
                tenantId: order.tenantId,
            },
        };

        if (idempotencyKey) {
            createOrderRequest.idempotencyKey = idempotencyKey;
        }

        const paymentOrder = await this.gateway.createOrder(createOrderRequest);

        return paymentOrder;
    }

    async verifyAndUpdatePayment(
        gatewayOrderId: string,
        paymentId: string,
        signature: string,
        orderId: string
    ): Promise<{ verified: boolean; order: unknown }> {
        // Check if order is already paid (prevents race condition with webhook)
        const existingOrder = await this.orderService.getById(orderId);
        if (existingOrder?.paymentStatus === "paid") {
            return { verified: true, order: existingOrder };
        }

        const result = await this.gateway.verifyPayment({
            orderId: orderId,
            paymentId,
            signature,
        });

        if (result.verified) {
            // Update order payment status
            const updatedOrder = await this.orderService.updatePaymentStatus(
                orderId,
                "paid",
                paymentId
            );
            return { verified: true, order: updatedOrder };
        }

        // Mark payment as failed
        await this.orderService.updatePaymentStatus(orderId, "failed");
        return { verified: false, order: null };
    }

    async refundPayment(
        orderId: string,
        amount?: number,
        idempotencyKey?: string
    ) {
        const order = await this.orderService.getById(orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        if (!order.paymentId) {
            throw new Error("No payment found for this order");
        }

        if (order.paymentStatus !== "paid") {
            throw new Error("Order is not paid");
        }

        const refundRequest: Parameters<typeof this.gateway.refund>[0] = {
            paymentId: order.paymentId,
            notes: {
                orderId: orderId,
                reason: "Customer refund request",
            },
        };

        if (amount) {
            refundRequest.amount = Math.round(amount * 100);
        }

        if (idempotencyKey) {
            refundRequest.idempotencyKey = idempotencyKey;
        }

        const refund = await this.gateway.refund(refundRequest);

        // Update order status to "refunded" for full refunds
        const isFullRefund = !amount || amount >= order.total;
        if (isFullRefund && refund.status === "succeeded") {
            await this.orderService.updatePaymentStatus(orderId, "refunded");
        }

        return refund;
    }

    async getPaymentDetails(paymentId: string) {
        return this.gateway.getPaymentDetails(paymentId);
    }

    async getRefundsForOrder(orderId: string) {
        const order = await this.orderService.getById(orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        if (!order.paymentId) {
            throw new Error("No payment found for this order");
        }

        if (!this.gateway.getRefunds) {
            throw new Error("Refund listing not supported by this gateway");
        }

        return this.gateway.getRefunds(order.paymentId);
    }
}
