import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import type { PaymentService } from "./payment-service";
import type { Logger } from "winston";

export class PaymentController {
    constructor(
        private paymentService: PaymentService,
        private logger: Logger
    ) {}

    async initiate(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        const { orderId } = req.body as { orderId: string };
        const currency = (req.body as { currency?: string }).currency || "INR";

        try {
            const paymentOrder = await this.paymentService.initiatePayment(
                orderId,
                currency
            );

            this.logger.info(`Payment initiated for order: ${orderId}`);
            res.status(200).json({
                message: "Payment initiated",
                payment: paymentOrder,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Payment initiation failed: ${err.message}`);
            return next(createHttpError(400, err.message));
        }
    }

    async verify(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId,
        } = req.body as {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
            orderId: string;
        };

        try {
            const { verified, order } =
                await this.paymentService.verifyAndUpdatePayment(
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                    orderId
                );

            if (verified) {
                this.logger.info(`Payment verified for order: ${orderId}`);
                res.status(200).json({
                    message: "Payment verified successfully",
                    verified: true,
                    order,
                });
            } else {
                this.logger.warn(
                    `Payment verification failed for order: ${orderId}`
                );
                res.status(400).json({
                    message: "Payment verification failed",
                    verified: false,
                });
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Payment verification error: ${err.message}`);
            return next(createHttpError(400, err.message));
        }
    }

    async refund(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        const { orderId, amount } = req.body as {
            orderId: string;
            amount?: number;
        };

        try {
            const refund = await this.paymentService.refundPayment(
                orderId,
                amount
            );

            this.logger.info(`Refund initiated for order: ${orderId}`);
            res.status(200).json({
                message: "Refund initiated successfully",
                refund,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Refund failed: ${err.message}`);
            return next(createHttpError(400, err.message));
        }
    }

    async getDetails(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const { paymentId } = req.params;

        if (!paymentId) {
            return next(createHttpError(400, "Payment ID is required"));
        }

        try {
            const payment =
                await this.paymentService.getPaymentDetails(paymentId);

            res.status(200).json({
                message: "Payment details fetched",
                payment,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to get payment details: ${err.message}`);
            return next(createHttpError(400, err.message));
        }
    }
}
