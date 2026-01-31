import mongoose, { type Model } from "mongoose";
import type {
    Wallet,
    WalletTransaction,
    TransactionType,
} from "./wallet-types";
import { CASHBACK_CONFIG } from "../config/cashback-config";
import type { Logger } from "winston";

export class WalletService {
    constructor(
        private walletModel: Model<Wallet>,
        private walletTransactionModel: Model<WalletTransaction>,
        private logger: Logger
    ) {}

    /**
     * Get or create wallet for user
     */
    async getOrCreateWallet(userId: string): Promise<Wallet> {
        let wallet = await this.walletModel.findOne({ userId });

        if (!wallet) {
            wallet = await this.walletModel.create({
                userId,
                balance: 0,
                currency: "INR",
                status: "active",
            });
            this.logger.info(`Created new wallet for user: ${userId}`);
        }

        return wallet;
    }

    /**
     * Get wallet balance
     */
    async getBalance(
        userId: string
    ): Promise<{ balance: number; currency: string }> {
        const wallet = await this.getOrCreateWallet(userId);
        return {
            balance: wallet.balance,
            currency: wallet.currency,
        };
    }

    /**
     * Add cashback to wallet after successful order
     * Uses idempotency to prevent duplicate cashback
     */
    async addCashback(
        userId: string,
        orderId: string,
        orderAmount: number,
        walletAmountUsed: number = 0
    ): Promise<WalletTransaction | null> {
        // Check if cashback is enabled
        if (!CASHBACK_CONFIG.enabled) {
            return null;
        }

        // Check if order meets minimum amount
        if (orderAmount < CASHBACK_CONFIG.minOrderAmount) {
            this.logger.info(
                `Order ${orderId} below minimum amount for cashback`
            );
            return null;
        }

        // Idempotency check: prevent duplicate cashback for same order
        const existingTransaction = await this.walletTransactionModel.findOne({
            orderId,
            type: "cashback",
            status: { $in: ["completed", "pending"] },
        });

        if (existingTransaction) {
            this.logger.warn(`Cashback already processed for order ${orderId}`);
            return existingTransaction;
        }

        // Calculate cashback amount
        let cashbackBase = orderAmount;

        // If configured to not apply on wallet payment, subtract wallet amount
        if (!CASHBACK_CONFIG.applyOnWalletPayment && walletAmountUsed > 0) {
            cashbackBase = orderAmount - walletAmountUsed;
        }

        let cashbackAmount = (cashbackBase * CASHBACK_CONFIG.percentage) / 100;

        // Apply maximum cap
        if (cashbackAmount > CASHBACK_CONFIG.maxCashbackPerOrder) {
            cashbackAmount = CASHBACK_CONFIG.maxCashbackPerOrder;
        }

        // Round to 2 decimals
        cashbackAmount = Math.round(cashbackAmount * 100) / 100;

        if (cashbackAmount <= 0) {
            return null;
        }

        // Start a session for atomic transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const wallet = await this.getOrCreateWallet(userId);

            // Atomic update: increment balance
            const updatedWallet = await this.walletModel.findOneAndUpdate(
                { userId, status: "active" },
                { $inc: { balance: cashbackAmount } },
                { new: true, session }
            );

            if (!updatedWallet) {
                throw new Error("Wallet not found or frozen");
            }

            // Create transaction record
            const transaction = await this.walletTransactionModel.create(
                [
                    {
                        walletId: updatedWallet._id?.toString(),
                        userId,
                        type: "cashback" as TransactionType,
                        amount: cashbackAmount,
                        orderId,
                        balanceBefore: wallet.balance,
                        balanceAfter: updatedWallet.balance,
                        status: "completed",
                        metadata: {
                            cashbackPercentage: CASHBACK_CONFIG.percentage,
                            orderAmount,
                            walletAmountUsed,
                        },
                    },
                ],
                { session }
            );

            await session.commitTransaction();
            this.logger.info(
                `Cashback of ₹${cashbackAmount} added for order ${orderId}`
            );

            return transaction[0] as WalletTransaction;
        } catch (error) {
            await session.abortTransaction();
            this.logger.error(
                `Failed to add cashback for order ${orderId}:`,
                error
            );
            throw error;
        } finally {
            void session.endSession();
        }
    }

    /**
     * Redeem wallet credits for an order
     * Uses atomic operations to prevent race conditions
     */
    async redeemCredits(
        userId: string,
        amount: number,
        orderId: string
    ): Promise<WalletTransaction> {
        // Idempotency check
        const existingTransaction = await this.walletTransactionModel.findOne({
            orderId,
            type: "redemption",
            status: { $in: ["completed", "pending"] },
        });

        if (existingTransaction) {
            this.logger.warn(
                `Redemption already processed for order ${orderId}`
            );
            return existingTransaction as WalletTransaction;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const wallet = await this.getOrCreateWallet(userId);

            // Check sufficient balance
            if (wallet.balance < amount) {
                throw new Error(
                    `Insufficient wallet balance. Available: ₹${wallet.balance}, Required: ₹${amount}`
                );
            }

            // Atomic update with balance constraint
            const updatedWallet = await this.walletModel.findOneAndUpdate(
                {
                    userId,
                    status: "active",
                    balance: { $gte: amount }, // Ensure balance is still sufficient
                },
                { $inc: { balance: -amount } },
                { new: true, session }
            );

            if (!updatedWallet) {
                throw new Error("Insufficient balance or wallet frozen");
            }

            // Create pending transaction
            const transaction = await this.walletTransactionModel.create(
                [
                    {
                        walletId: updatedWallet._id?.toString(),
                        userId,
                        type: "redemption" as TransactionType,
                        amount: -amount, // Negative for debit
                        orderId,
                        balanceBefore: wallet.balance,
                        balanceAfter: updatedWallet.balance,
                        status: "pending", // Mark as pending until order is confirmed
                    },
                ],
                { session }
            );

            await session.commitTransaction();
            this.logger.info(
                `Redeemed ₹${amount} from wallet for order ${orderId}`
            );

            return transaction[0] as WalletTransaction;
        } catch (error) {
            await session.abortTransaction();
            this.logger.error(
                `Failed to redeem credits for order ${orderId}:`,
                error
            );
            throw error;
        } finally {
            void session.endSession();
        }
    }

    /**
     * Complete a pending redemption transaction
     */
    async completeRedemption(orderId: string): Promise<void> {
        await this.walletTransactionModel
            .updateOne(
                { orderId, type: "redemption", status: "pending" },
                { status: "completed" }
            )
            .exec();
        this.logger.info(`Completed redemption for order ${orderId}`);
    }

    /**
     * Rollback a pending redemption (if order fails)
     */
    async rollbackRedemption(userId: string, orderId: string): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Find the pending transaction
            const transaction = await this.walletTransactionModel.findOne({
                orderId,
                type: "redemption",
                status: "pending",
            });

            if (!transaction) {
                this.logger.warn(
                    `No pending redemption found for order ${orderId}`
                );
                return;
            }

            const refundAmount = Math.abs(transaction.amount);

            // Refund the amount back to wallet
            await this.walletModel.findOneAndUpdate(
                { userId },
                { $inc: { balance: refundAmount } },
                { session }
            );

            // Mark transaction as rolled back
            await this.walletTransactionModel
                .updateOne(
                    { _id: transaction._id },
                    { status: "rolled_back" },
                    { session }
                )
                .exec();

            await session.commitTransaction();
            this.logger.info(
                `Rolled back redemption of ₹${refundAmount} for order ${orderId}`
            );
        } catch (error) {
            await session.abortTransaction();
            this.logger.error(
                `Failed to rollback redemption for order ${orderId}:`,
                error
            );
            throw error;
        } finally {
            void session.endSession();
        }
    }

    /**
     * Refund amount to wallet (for order cancellations/refunds)
     */
    async refundToWallet(
        userId: string,
        amount: number,
        orderId: string
    ): Promise<WalletTransaction> {
        // Check for duplicate refund
        const existingRefund = await this.walletTransactionModel.findOne({
            orderId,
            type: "refund",
            amount: amount,
            status: "completed",
        });

        if (existingRefund) {
            this.logger.warn(`Refund already processed for order ${orderId}`);
            return existingRefund as WalletTransaction;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const wallet = await this.getOrCreateWallet(userId);

            const updatedWallet = await this.walletModel.findOneAndUpdate(
                { userId },
                { $inc: { balance: amount } },
                { new: true, session }
            );

            if (!updatedWallet) {
                throw new Error("Wallet not found");
            }

            const transaction = await this.walletTransactionModel.create(
                [
                    {
                        walletId: updatedWallet._id?.toString(),
                        userId,
                        type: "refund" as TransactionType,
                        amount: amount,
                        orderId,
                        balanceBefore: wallet.balance,
                        balanceAfter: updatedWallet.balance,
                        status: "completed",
                    },
                ],
                { session }
            );

            await session.commitTransaction();
            this.logger.info(
                `Refunded ₹${amount} to wallet for order ${orderId}`
            );

            return transaction[0] as WalletTransaction;
        } catch (error) {
            await session.abortTransaction();
            this.logger.error(
                `Failed to refund to wallet for order ${orderId}:`,
                error
            );
            throw error;
        } finally {
            void session.endSession();
        }
    }

    /**
     * Get transaction history for user
     */
    async getTransactions(
        userId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ transactions: WalletTransaction[]; total: number }> {
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            this.walletTransactionModel
                .find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.walletTransactionModel.countDocuments({ userId }),
        ]);

        return { transactions, total };
    }

    /**
     * Calculate cashback for an order (without adding it)
     */
    calculateCashback(
        orderAmount: number,
        walletAmountUsed: number = 0
    ): number {
        if (!CASHBACK_CONFIG.enabled) {
            return 0;
        }

        if (orderAmount < CASHBACK_CONFIG.minOrderAmount) {
            return 0;
        }

        let cashbackBase = orderAmount;
        if (!CASHBACK_CONFIG.applyOnWalletPayment && walletAmountUsed > 0) {
            cashbackBase = orderAmount - walletAmountUsed;
        }

        let cashback = (cashbackBase * CASHBACK_CONFIG.percentage) / 100;

        if (cashback > CASHBACK_CONFIG.maxCashbackPerOrder) {
            cashback = CASHBACK_CONFIG.maxCashbackPerOrder;
        }

        return Math.round(cashback * 100) / 100;
    }
}
