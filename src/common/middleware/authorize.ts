import { type Request, type Response, type NextFunction } from "express";
import createHttpError from "http-errors";

export const authorize = (allowedRoles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(createHttpError(401, "User not authenticated"));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                createHttpError(
                    403,
                    "You do not have permission to access this resource"
                )
            );
        }

        next();
    };
};
