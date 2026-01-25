import { type Request, type Response, type NextFunction } from "express";
import { IdempotencyService } from "./idempotency-service";
import IdempotencyModel from "./idempotency-model";
import { IDEMPOTENCY_HEADER } from "./idempotency-types";
import createHttpError from "http-errors";

const idempotencyService = new IdempotencyService(IdempotencyModel);

/**
 * Idempotency Check Middleware
 *
 * This middleware ONLY checks for existing idempotency records.
 * Saving is handled by the controller with MongoDB transactions.
 *
 * Flow:
 * 1. Client sends request with header: x-idempotency-key: "unique-key-123"
 * 2. Middleware checks if this key was already used
 * 3. If YES: Return cached response (no duplicate processing)
 * 4. If NO: Attach key to request, let controller handle with transaction
 */
export const idempotencyMiddleware = (options?: { required?: boolean }) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        const idempotencyKey = req.headers[IDEMPOTENCY_HEADER] as string;

        // If no key provided
        if (!idempotencyKey) {
            if (options?.required) {
                return next(
                    createHttpError(
                        400,
                        `Missing required header: ${IDEMPOTENCY_HEADER}`
                    )
                );
            }
            // Key not required, proceed without idempotency
            return next();
        }

        const userId = req.user?.sub;
        if (!userId) {
            return next(createHttpError(401, "User not authenticated"));
        }

        const endpoint = `${req.method} ${req.baseUrl}${req.path}`;

        try {
            // Check for existing record
            const existingRecord = await idempotencyService.findExisting(
                idempotencyKey,
                String(userId),
                endpoint
            );

            if (existingRecord) {
                // Return cached response (idempotent!)
                res.status(existingRecord.statusCode).json({
                    ...existingRecord.response,
                    _idempotent: true,
                    _originalCreatedAt: existingRecord.createdAt,
                });
                return;
            }

            // Attach idempotency info to request for controller to use with transaction
            req.idempotency = {
                key: idempotencyKey,
                userId: String(userId),
                endpoint,
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};
