/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Razorpay from "razorpay";
import crypto from "crypto";
import type {
    PaymentGateway,
    CreateOrderRequest,
    PaymentOrder,
    VerifyPaymentRequest,
    PaymentVerificationResult,
    RefundRequest,
    RefundResult,
} from "../payment-types";

interface RazorpayOrder {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
}

interface RazorpayRefund {
    id: string;
    payment_id: string;
    amount: number;
    status: string;
}

export class RazorpayGateway implements PaymentGateway {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private razorpay: any;
    private keySecret: string;

    constructor(keyId: string, keySecret: string) {
        this.razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
        this.keySecret = keySecret;
    }

    async createOrder(request: CreateOrderRequest): Promise<PaymentOrder> {
        const options = {
            amount: request.amount,
            currency: request.currency,
            receipt: request.receipt || request.orderId,
            notes: request.notes || {},
        };

        const order = (await this.razorpay.orders.create(
            options
        )) as RazorpayOrder;

        return {
            id: request.orderId,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
            gatewayOrderId: order.id,
        };
    }

    verifyPayment(
        request: VerifyPaymentRequest
    ): Promise<PaymentVerificationResult> {
        const body = request.orderId + "|" + request.paymentId;

        const expectedSignature = crypto
            .createHmac("sha256", this.keySecret)
            .update(body)
            .digest("hex");

        const verified = expectedSignature === request.signature;

        return Promise.resolve({
            verified,
            orderId: request.orderId,
            paymentId: request.paymentId,
        });
    }

    async refund(request: RefundRequest): Promise<RefundResult> {
        const refundOptions: {
            amount?: number;
            notes?: Record<string, string>;
        } = {};

        if (request.amount) {
            refundOptions.amount = request.amount;
        }
        if (request.notes) {
            refundOptions.notes = request.notes;
        }

        const refund = (await this.razorpay.payments.refund(
            request.paymentId,
            refundOptions
        )) as RazorpayRefund;

        return {
            id: refund.id,
            paymentId: refund.payment_id,
            amount: refund.amount,
            status: refund.status,
        };
    }

    async getPaymentDetails(
        paymentId: string
    ): Promise<Record<string, unknown>> {
        const payment = await this.razorpay.payments.fetch(paymentId);
        return payment as unknown as Record<string, unknown>;
    }
}
