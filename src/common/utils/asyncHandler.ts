import { type Request, type Response, type NextFunction } from "express";
import createHttpError from "http-errors";
import logger from "../../config/logger";

export const asyncHandler = <T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch((err: unknown) => {
            logger.error("Async handler caught error:", err);

            const message =
                err instanceof Error ? err.message : "Internal Server Error";
            next(createHttpError(500, message));
        });
    };
};
