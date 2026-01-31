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
        // Use finalTotal (after wallet deduction) if available, otherwise fall back to total
        const chargeableAmount = order.finalTotal ?? order.total;
        const amountInSmallestUnit = Math.round(chargeableAmount * 100);

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
        idempotencyKey?: string,
        walletService?: {
            refundToWallet: (
                userId: string,
                amount: number,
                orderId: string
            ) => Promise<unknown>;
        }
    ) {
        const order = await this.orderService.getById(orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        // Check if already fully refunded
        if (order.paymentStatus === "refunded") {
            throw new Error("Order already fully refunded");
        }

        if (order.paymentStatus !== "paid") {
            throw new Error("Order is not paid");
        }

        // Determine refund amount (full or partial)
        const refundAmount = amount || order.total;

        // Validate refund amount
        if (refundAmount > order.total) {
            throw new Error("Refund amount exceeds order total");
        }

        // Check cumulative refunds
        const previouslyRefunded = order.refundDetails?.totalRefunded || 0;
        const maxRefundable = order.total - previouslyRefunded;

        if (refundAmount > maxRefundable) {
            throw new Error(
                `Maximum refundable amount is ₹${maxRefundable}. Already refunded: ₹${previouslyRefunded}`
            );
        }

        // Calculate proportional split
        const walletCreditsUsed = order.walletCreditsApplied || 0;
        const hasWalletCredits = walletCreditsUsed > 0;

        let walletRefundAmount = 0;
        let gatewayRefundAmount = refundAmount;

        // Special case: If finalTotal is 0 (100% wallet payment)
        if (order.finalTotal === 0 && walletService) {
            walletRefundAmount = refundAmount;
            gatewayRefundAmount = 0;

            // Refund to wallet only
            await walletService.refundToWallet(
                order.customerId,
                walletRefundAmount,
                orderId
            );

            // Update order status
            const isFullRefund = refundAmount >= order.total;
            if (isFullRefund) {
                await this.orderService.updatePaymentStatus(
                    orderId,
                    "refunded"
                );
            }

            return {
                totalRefund: refundAmount,
                walletRefund: walletRefundAmount,
                gatewayRefund: 0,
                gatewayRefundDetails: null,
            };
        }

        // Calculate proportional split for mixed payments
        if (hasWalletCredits && walletService) {
            const walletProportion = walletCreditsUsed / order.total;
            const gatewayProportion = order.finalTotal / order.total;

            // Split refund proportionally
            walletRefundAmount =
                Math.round(refundAmount * walletProportion * 100) / 100;
            gatewayRefundAmount =
                Math.round(refundAmount * gatewayProportion * 100) / 100;

            // Ensure total matches (handle rounding)
            const totalCalculated = walletRefundAmount + gatewayRefundAmount;
            if (totalCalculated !== refundAmount) {
                const diff = refundAmount - totalCalculated;
                gatewayRefundAmount += diff; // Adjust gateway amount
            }
        }

        // Step 1: Refund to wallet (if applicable)
        if (walletRefundAmount > 0 && walletService) {
            await walletService.refundToWallet(
                order.customerId,
                walletRefundAmount,
                orderId
            );
        }

        // Step 2: Refund to payment gateway (if amount > 0)
        let gatewayRefund = null;
        if (gatewayRefundAmount > 0 && order.paymentId) {
            const refundRequest: Parameters<typeof this.gateway.refund>[0] = {
                paymentId: order.paymentId,
                amount: Math.round(gatewayRefundAmount * 100), // Convert to paise
                notes: {
                    orderId: orderId,
                    reason: "Customer refund request",
                    walletRefundAmount: walletRefundAmount.toString(),
                    gatewayRefundAmount: gatewayRefundAmount.toString(),
                },
            };

            if (idempotencyKey) {
                refundRequest.idempotencyKey = idempotencyKey;
            }

            gatewayRefund = await this.gateway.refund(refundRequest);
        }

        // Step 3: Update order status
        const isFullRefund = refundAmount >= order.total;
        if (
            isFullRefund &&
            (!gatewayRefund || gatewayRefund.status === "succeeded")
        ) {
            await this.orderService.updatePaymentStatus(orderId, "refunded");
        }

        return {
            totalRefund: refundAmount,
            walletRefund: walletRefundAmount,
            gatewayRefund: gatewayRefundAmount,
            gatewayRefundDetails: gatewayRefund,
        };
    }

    async getPaymentDetails(paymentId: string) {
        return this.gateway.getPaymentDetails(paymentId);
    }

    async getRefundsForOrder(orderId: string) {
        const order = await this.orderService.getById(orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        // Wallet-only orders have no gateway payment — return empty refunds
        if (!order.paymentId) {
            return [];
        }

        if (!this.gateway.getRefunds) {
            throw new Error("Refund listing not supported by this gateway");
        }

        return this.gateway.getRefunds(order.paymentId);
    }
}
