import type { CashbackConfig } from "../wallet/wallet-types";

export const CASHBACK_CONFIG: CashbackConfig = {
    enabled: true,
    percentage: 5, // 5% cashback
    maxCashbackPerOrder: 100, // Maximum ₹100 per order
    applicableOn: "subTotal", // Apply on subTotal (exclude delivery charges and taxes)
    minOrderAmount: 100, // Minimum ₹100 order to earn cashback
    applyOnWalletPayment: false, // Don't earn cashback on wallet-paid amount (prevent infinite loop)
};
