import { type Request, type Response, type NextFunction } from "express";
import { IdempotencyService } from "./idempotency-service";
import IdempotencyModel from "./idempotency-model";
import { IDEMPOTENCY_HEADER } from "./idempotency-types";
import createHttpError from "http-errors";

const idempotencyService = new IdempotencyService(IdempotencyModel);

/**
 * Idempotency Middleware
 *
 * How it works:
 * 1. Client sends request with header: x-idempotency-key: "unique-key-123"
 * 2. Middleware checks if this key was already used
 * 3. If YES: Return cached response (no duplicate processing)
 * 4. If NO: Process request, cache response, return to client
 *
 * TTL: Records auto-expire after 24 hours (configurable)
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
                    _idempotent: true, // Flag to indicate this is a cached response
                    _originalCreatedAt: existingRecord.createdAt,
                });
                return;
            }

            // Store original res.json to intercept response
            const originalJson = res.json.bind(res);

            res.json = ((body: Record<string, unknown>) => {
                // Save response to idempotency store
                idempotencyService
                    .create({
                        key: idempotencyKey,
                        userId: String(userId),
                        endpoint,
                        statusCode: res.statusCode,
                        response: body,
                    })
                    .catch((err) => {
                        // Log error but don't fail the request
                        console.error(
                            "Failed to save idempotency record:",
                            err
                        );
                    });

                return originalJson(body);
            }) as Response["json"];

            next();
        } catch (error) {
            next(error);
        }
    };
};
