import type { ClientSession, Model } from "mongoose";
import type { IdempotencyRecord } from "./idempotency-types";
import { DEFAULT_TTL_HOURS } from "./idempotency-types";

export class IdempotencyService {
    constructor(private idempotencyModel: Model<IdempotencyRecord>) {}

    /**
     * Find existing idempotency record (non-expired)
     */
    async findExisting(
        key: string,
        userId: string,
        endpoint: string
    ): Promise<IdempotencyRecord | null> {
        const record = await this.idempotencyModel.findOne({
            key,
            userId,
            endpoint,
            expiresAt: { $gt: new Date() }, // Only return if not expired
        });
        return record;
    }

    /**
     * Create new idempotency record with TTL
     */
    async create(data: {
        key: string;
        userId: string;
        endpoint: string;
        statusCode: number;
        response: Record<string, unknown>;
        ttlHours?: number;
    }): Promise<IdempotencyRecord> {
        const expiresAt = new Date();
        expiresAt.setHours(
            expiresAt.getHours() + (data.ttlHours || DEFAULT_TTL_HOURS)
        );

        const record = new this.idempotencyModel({
            key: data.key,
            userId: data.userId,
            endpoint: data.endpoint,
            statusCode: data.statusCode,
            response: data.response,
            expiresAt,
        });

        return record.save();
    }

    /**
     * Create new idempotency record with TTL (with MongoDB session for transactions)
     */
    async createWithSession(
        data: {
            key: string;
            userId: string;
            endpoint: string;
            statusCode: number;
            response: Record<string, unknown>;
            ttlHours?: number;
        },
        session: ClientSession
    ): Promise<IdempotencyRecord> {
        const expiresAt = new Date();
        expiresAt.setHours(
            expiresAt.getHours() + (data.ttlHours || DEFAULT_TTL_HOURS)
        );

        const record = new this.idempotencyModel({
            key: data.key,
            userId: data.userId,
            endpoint: data.endpoint,
            statusCode: data.statusCode,
            response: data.response,
            expiresAt,
        });

        return record.save({ session });
    }

    /**
     * Delete idempotency records for a user (optional cleanup)
     */
    async deleteByKey(key: string, userId: string): Promise<void> {
        await this.idempotencyModel.deleteMany({ key, userId });
    }
}
