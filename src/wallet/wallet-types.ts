export interface Wallet {
    _id?: string;
    userId: string;
    balance: number;
    currency: string;
    status: "active" | "frozen";
    createdAt?: Date;
    updatedAt?: Date;
}

export type TransactionType = "cashback" | "redemption" | "refund";
export type TransactionStatus =
    | "pending"
    | "completed"
    | "failed"
    | "rolled_back";

export interface WalletTransaction {
    _id?: string;
    walletId: string;
    userId: string;
    type: TransactionType;
    amount: number; // Positive for credit, negative for debit
    orderId: string;
    balanceBefore: number;
    balanceAfter: number;
    status: TransactionStatus;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CashbackConfig {
    enabled: boolean;
    percentage: number;
    maxCashbackPerOrder: number;
    applicableOn: "subTotal" | "total"; // Apply on subTotal (exclude delivery/taxes) or total
    minOrderAmount: number; // Minimum order amount to earn cashback
    applyOnWalletPayment: boolean; // Should cashback be earned on wallet-paid amount?
}
