export type OrderStatus =
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";

export type PaymentMode = "card" | "cash" | "upi" | "netbanking" | "wallet";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderTopping {
    _id: string;
    name: string;
    image: string;
    price: number;
}

export interface OrderItem {
    _id: string;
    name: string;
    image: string;
    qty: number;
    priceConfiguration: Record<string, string>;
    toppings: OrderTopping[];
    totalPrice: number;
}

export interface TaxBreakdownItem {
    name: string;
    rate: number;
    amount: number;
}

export interface RefundDetails {
    totalRefunded: number;
    walletRefunded: number;
    gatewayRefunded: number;
    refundedAt: Date;
}

export interface Order {
    _id?: string;
    customerId: string;
    address: string;
    items: OrderItem[];
    subTotal: number;
    couponCode?: string;
    discount: number;
    deliveryCharge: number;
    taxes: TaxBreakdownItem[];
    taxTotal: number;
    total: number;
    walletCreditsApplied?: number; // Amount deducted from wallet
    finalTotal: number; // total - walletCreditsApplied (actual payment needed)
    paymentMode: PaymentMode;
    paymentStatus: PaymentStatus;
    paymentId?: string;
    status: OrderStatus;
    tenantId: string;
    refundDetails?: RefundDetails; // Track cumulative refunds
    createdAt?: Date;
    updatedAt?: Date;
}
