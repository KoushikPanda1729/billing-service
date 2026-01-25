export interface AuthPayload {
    sub: number;
    role: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    tenant?: number;
}

export interface IdempotencyInfo {
    key: string;
    userId: string;
    endpoint: string;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthPayload;
            idempotency?: IdempotencyInfo;
        }
    }
}
