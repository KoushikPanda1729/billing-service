export interface CreateOrderRequest {
    amount: number; // Amount in smallest currency unit (paise for INR)
    currency: string;
    orderId: string;
    receipt?: string;
    notes?: Record<string, string>;
}

export interface PaymentOrder {
    id: string;
    amount: number;
    currency: string;
    receipt?: string;
    status: string;
    gatewayOrderId: string;
    paymentUrl?: string | null; // URL to redirect user for payment (Stripe Checkout)
}

export interface VerifyPaymentRequest {
    orderId: string;
    paymentId: string;
    signature: string;
}

export interface PaymentVerificationResult {
    verified: boolean;
    orderId: string;
    paymentId: string;
}

export interface RefundRequest {
    paymentId: string;
    amount?: number; // Optional for partial refund
    notes?: Record<string, string>;
}

export interface RefundResult {
    id: string;
    paymentId: string;
    amount: number;
    status: string;
}

// Gateway-agnostic payment gateway interface
export interface PaymentGateway {
    createOrder(request: CreateOrderRequest): Promise<PaymentOrder>;
    verifyPayment(
        request: VerifyPaymentRequest
    ): Promise<PaymentVerificationResult>;
    refund(request: RefundRequest): Promise<RefundResult>;
    getPaymentDetails(paymentId: string): Promise<Record<string, unknown>>;
}

export type PaymentGatewayType = "razorpay" | "stripe" | "paypal";
