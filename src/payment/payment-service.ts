import type { PaymentGateway, PaymentOrder } from "./payment-types";
import type { OrderService } from "../order/order-service";

export class PaymentService {
    constructor(
        private gateway: PaymentGateway,
        private orderService: OrderService
    ) {}

    async initiatePayment(
        orderId: string,
        currency: string = "INR"
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

        const paymentOrder = await this.gateway.createOrder({
            amount: amountInSmallestUnit,
            currency,
            orderId: orderId,
            receipt: `receipt_${orderId}`,
            notes: {
                orderId: orderId,
                customerId: order.customerId,
                tenantId: order.tenantId,
            },
        });

        return paymentOrder;
    }

    async verifyAndUpdatePayment(
        gatewayOrderId: string,
        paymentId: string,
        signature: string,
        orderId: string
    ): Promise<{ verified: boolean; order: unknown }> {
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

    async refundPayment(orderId: string, amount?: number) {
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

        const refund = await this.gateway.refund(refundRequest);

        return refund;
    }

    async getPaymentDetails(paymentId: string) {
        return this.gateway.getPaymentDetails(paymentId);
    }
}
