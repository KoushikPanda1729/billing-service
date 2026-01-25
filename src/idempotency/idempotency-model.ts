import mongoose from "mongoose";
import type { IdempotencyRecord } from "./idempotency-types";

const idempotencySchema = new mongoose.Schema<IdempotencyRecord>(
    {
        key: { type: String, required: true },
        userId: { type: String, required: true },
        endpoint: { type: String, required: true },
        statusCode: { type: Number, required: true },
        response: { type: mongoose.Schema.Types.Mixed, required: true },
        expiresAt: { type: Date, required: true },
    },
    {
        timestamps: true,
    }
);

// Compound unique index: same user can't reuse same key for same endpoint
idempotencySchema.index({ key: 1, userId: 1, endpoint: 1 }, { unique: true });

// TTL Index: MongoDB automatically deletes documents when expiresAt passes
// expireAfterSeconds: 0 means delete exactly at expiresAt time
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyModel = mongoose.model<IdempotencyRecord>(
    "IdempotencyRecord",
    idempotencySchema
);

export default IdempotencyModel;
