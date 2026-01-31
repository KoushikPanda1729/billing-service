import mongoose from "mongoose";
import type { Wallet, WalletTransaction } from "./wallet-types";

// Wallet Schema
const walletSchema = new mongoose.Schema<Wallet>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        balance: {
            type: Number,
            required: true,
            default: 0,
            min: 0, // Prevent negative balance at schema level
        },
        currency: {
            type: String,
            required: true,
            default: "INR",
        },
        status: {
            type: String,
            enum: ["active", "frozen"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
walletSchema.index({ userId: 1 }, { unique: true });
walletSchema.index({ status: 1 });

export const WalletModel = mongoose.model<Wallet>("Wallet", walletSchema);

// Wallet Transaction Schema
const walletTransactionSchema = new mongoose.Schema<WalletTransaction>(
    {
        walletId: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["cashback", "redemption", "refund"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        orderId: {
            type: String,
            required: true,
            index: true, // Important for idempotency checks
        },
        balanceBefore: {
            type: Number,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "rolled_back"],
            default: "pending",
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for querying
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ orderId: 1, type: 1 }); // For idempotency
walletTransactionSchema.index({ status: 1 });

export const WalletTransactionModel = mongoose.model<WalletTransaction>(
    "WalletTransaction",
    walletTransactionSchema
);
