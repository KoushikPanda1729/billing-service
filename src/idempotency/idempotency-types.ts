export interface IdempotencyRecord {
    _id?: string;
    key: string; // Unique idempotency key from client (sent in header)
    userId: string; // User who made the request
    endpoint: string; // API endpoint (e.g., "POST /orders")
    statusCode: number; // HTTP status code of original response
    response: Record<string, unknown>; // Cached response body
    expiresAt: Date; // TTL - auto-delete after this time
    createdAt?: Date;
    updatedAt?: Date;
}

export const IDEMPOTENCY_HEADER = "x-idempotency-key";
export const DEFAULT_TTL_HOURS = 24; // Records expire after 24 hours
