import type { Request, Response } from "express";
import Stripe from "stripe";
import type { Logger } from "winston";
import type { OrderService } from "../order/order-service";
import type { IMessageBroker } from "../common/types/broker";

export class WebhookController {
    private stripe: Stripe;

    constructor(
        secretKey: string,
        private webhookSecret: string,
        private orderService: OrderService,
        private logger: Logger,
        private broker: IMessageBroker
    ) {
        this.stripe = new Stripe(secretKey);
    }

    async handleWebhook(req: Request, res: Response): Promise<void> {
        const sig = req.headers["stripe-signature"] as string;

        if (!sig) {
            this.logger.error("Webhook Error: No signature provided");
            res.status(400).send("No signature provided");
            return;
        }

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                req.body as Buffer,
                sig,
                this.webhookSecret
            );
        } catch (err) {
            const error = err as Error;
            this.logger.error(
                `Webhook signature verification failed: ${error.message}`
            );
            res.status(400).send(`Webhook Error: ${error.message}`);
            return;
        }

        // Handle the event - always return 200 to prevent Stripe retries
        try {
            switch (event.type) {
                case "checkout.session.completed": {
                    const session = event.data.object;
                    await this.handleCheckoutSessionCompleted(session);
                    break;
                }

                case "checkout.session.expired": {
                    const session = event.data.object;
                    await this.handleCheckoutSessionExpired(session);
                    break;
                }

                case "charge.refunded": {
                    const charge = event.data.object;
                    this.handleChargeRefunded(charge);
                    break;
                }

                case "payment_intent.payment_failed": {
                    const paymentIntent = event.data.object;
                    await this.handlePaymentFailed(paymentIntent);
                    break;
                }

                default:
                    this.logger.info(`Unhandled event type: ${event.type}`);
            }
        } catch (err) {
            const error = err as Error;
            // Log error but don't return 500 - prevents Stripe retries causing duplicates
            this.logger.error(`Webhook handler error: ${error.message}`);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ received: true });
    }

    private async handleCheckoutSessionCompleted(
        session: Stripe.Checkout.Session
    ): Promise<void> {
        const orderId = session.metadata?.orderId;

        if (!orderId) {
            this.logger.error(
                "Checkout session completed but no orderId in metadata"
            );
            return;
        }

        // Check if order is already paid (prevents race condition with verify endpoint)
        const order = await this.orderService.getById(orderId);
        if (order?.paymentStatus === "paid") {
            this.logger.info(
                `Order ${orderId} already marked as paid, skipping`
            );
            return;
        }

        if (session.payment_status === "paid") {
            const updatedOrder = await this.orderService.updatePaymentStatus(
                orderId,
                "paid",
                session.id
            );
            this.logger.info(`Payment completed for order: ${orderId}`);

            try {
                await this.broker.sendMessage({
                    topic: "order",
                    key: orderId,
                    value: JSON.stringify({
                        event: "order-payment-completed",
                        data: updatedOrder,
                    }),
                });
            } catch (brokerErr) {
                this.logger.error(
                    `Failed to send order-payment-completed event for order: ${orderId}`,
                    brokerErr
                );
            }
        }
    }

    private async handleCheckoutSessionExpired(
        session: Stripe.Checkout.Session
    ): Promise<void> {
        const orderId = session.metadata?.orderId;

        if (!orderId) {
            this.logger.error(
                "Checkout session expired but no orderId in metadata"
            );
            return;
        }

        this.logger.info(`Payment session expired for order: ${orderId}`);
        const updatedOrder = await this.orderService.updatePaymentStatus(
            orderId,
            "failed"
        );

        try {
            await this.broker.sendMessage({
                topic: "order",
                key: orderId,
                value: JSON.stringify({
                    event: "order-payment-failed",
                    data: updatedOrder,
                }),
            });
        } catch (brokerErr) {
            this.logger.error(
                `Failed to send order-payment-failed event for order: ${orderId}`,
                brokerErr
            );
        }
    }

    private handleChargeRefunded(charge: Stripe.Charge): void {
        this.logger.info(
            `Charge refunded: ${charge.id}, amount: ${charge.amount_refunded}`
        );
        // You can add logic here to update order status to "refunded" if needed
    }

    private async handlePaymentFailed(
        paymentIntent: Stripe.PaymentIntent
    ): Promise<void> {
        const orderId = paymentIntent.metadata?.orderId;

        if (!orderId) {
            this.logger.error("Payment failed but no orderId in metadata");
            return;
        }

        this.logger.info(`Payment failed for order: ${orderId}`);
        const updatedOrder = await this.orderService.updatePaymentStatus(
            orderId,
            "failed"
        );

        try {
            await this.broker.sendMessage({
                topic: "order",
                key: orderId,
                value: JSON.stringify({
                    event: "order-payment-failed",
                    data: updatedOrder,
                }),
            });
        } catch (brokerErr) {
            this.logger.error(
                `Failed to send order-payment-failed event for order: ${orderId}`,
                brokerErr
            );
        }
    }
}
