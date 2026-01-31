import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import type { WalletService } from "./wallet-service";
import type { Logger } from "winston";

export class WalletController {
    constructor(
        private walletService: WalletService,
        private logger: Logger
    ) {}

    /**
     * Get wallet balance for authenticated user
     */
    async getBalance(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            // Get userId from auth middleware (req.user)
            const userId = (req as Request & { user?: { sub?: string } }).user
                ?.sub;

            if (!userId) {
                return next(createHttpError(401, "Unauthorized"));
            }

            const { balance, currency } =
                await this.walletService.getBalance(userId);

            res.status(200).json({
                balance,
                currency,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to get wallet balance: ${err.message}`);
            return next(createHttpError(500, "Failed to get wallet balance"));
        }
    }

    /**
     * Get transaction history for authenticated user
     */
    async getTransactions(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = (req as Request & { user?: { sub?: string } }).user
                ?.sub;

            if (!userId) {
                return next(createHttpError(401, "Unauthorized"));
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const { transactions, total } =
                await this.walletService.getTransactions(userId, page, limit);

            res.status(200).json({
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(
                `Failed to get transaction history: ${err.message}`
            );
            return next(
                createHttpError(500, "Failed to get transaction history")
            );
        }
    }

    /**
     * Calculate potential cashback for an order (preview)
     */
    calculateCashback(req: Request, res: Response, next: NextFunction): void {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        try {
            const { orderAmount, walletAmountUsed } = req.body as {
                orderAmount: number;
                walletAmountUsed?: number;
            };

            const cashback = this.walletService.calculateCashback(
                orderAmount,
                walletAmountUsed || 0
            );

            res.status(200).json({
                orderAmount,
                walletAmountUsed: walletAmountUsed || 0,
                cashbackAmount: cashback,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to calculate cashback: ${err.message}`);
            return next(createHttpError(500, "Failed to calculate cashback"));
        }
    }
}
