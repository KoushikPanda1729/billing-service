import Stripe from "stripe";
import type {
    PaymentGateway,
    CreateOrderRequest,
    PaymentOrder,
    VerifyPaymentRequest,
    PaymentVerificationResult,
    RefundRequest,
    RefundResult,
} from "../payment-types";

export class StripeGateway implements PaymentGateway {
    private stripe: Stripe;
    private successUrl: string;
    private cancelUrl: string;

    constructor(secretKey: string, successUrl?: string, cancelUrl?: string) {
        this.stripe = new Stripe(secretKey);
        this.successUrl = successUrl || "http://localhost:3000/payment/success";
        this.cancelUrl = cancelUrl || "http://localhost:3000/payment/cancel";
    }

    async createOrder(request: CreateOrderRequest): Promise<PaymentOrder> {
        // Create a Checkout Session
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: request.currency.toLowerCase(),
                        product_data: {
                            name: `Order #${request.orderId}`,
                        },
                        unit_amount: request.amount,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${this.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: this.cancelUrl,
            metadata: {
                orderId: request.orderId,
                receipt: request.receipt || request.orderId,
                ...request.notes,
            },
        });

        const result: PaymentOrder = {
            id: request.orderId,
            amount: session.amount_total || request.amount,
            currency: request.currency.toUpperCase(),
            status: session.payment_status,
            gatewayOrderId: session.id,
            paymentUrl: session.url,
        };

        if (request.receipt) {
            result.receipt = request.receipt;
        }

        return result;
    }

    async verifyPayment(
        request: VerifyPaymentRequest
    ): Promise<PaymentVerificationResult> {
        // Retrieve the checkout session
        const session = await this.stripe.checkout.sessions.retrieve(
            request.paymentId
        );

        const verified =
            session.payment_status === "paid" &&
            session.metadata?.orderId === request.orderId;

        return {
            verified,
            orderId: request.orderId,
            paymentId: request.paymentId,
        };
    }

    async refund(request: RefundRequest): Promise<RefundResult> {
        // First get the session to find the payment intent
        const session = await this.stripe.checkout.sessions.retrieve(
            request.paymentId
        );

        if (!session.payment_intent) {
            throw new Error("No payment intent found for this session");
        }

        const refundParams: Stripe.RefundCreateParams = {
            payment_intent: session.payment_intent as string,
        };

        if (request.amount) {
            refundParams.amount = request.amount;
        }

        if (request.notes) {
            refundParams.metadata = request.notes;
        }

        const refund = await this.stripe.refunds.create(refundParams);

        return {
            id: refund.id,
            paymentId: request.paymentId,
            amount: refund.amount || 0,
            status: refund.status || "pending",
        };
    }

    async getPaymentDetails(
        paymentId: string
    ): Promise<Record<string, unknown>> {
        const session = await this.stripe.checkout.sessions.retrieve(paymentId);
        return session as unknown as Record<string, unknown>;
    }

    async getRefunds(paymentId: string): Promise<RefundResult[]> {
        // Get the session to find the payment intent
        const session = await this.stripe.checkout.sessions.retrieve(paymentId);

        if (!session.payment_intent) {
            return [];
        }

        // List all refunds for this payment intent
        const refunds = await this.stripe.refunds.list({
            payment_intent: session.payment_intent as string,
        });

        return refunds.data.map((refund) => ({
            id: refund.id,
            paymentId: paymentId,
            amount: refund.amount || 0,
            status: refund.status || "pending",
        }));
    }
}
