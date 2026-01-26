import type { Request, Response } from "express";
import Stripe from "stripe";
import type { Logger } from "winston";
import type { OrderService } from "../order/order-service";

export class WebhookController {
    private stripe: Stripe;

    constructor(
        secretKey: string,
        private webhookSecret: string,
        private orderService: OrderService,
        private logger: Logger
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

        // Handle the event
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

            res.status(200).json({ received: true });
        } catch (err) {
            const error = err as Error;
            this.logger.error(`Webhook handler error: ${error.message}`);
            res.status(500).send(`Webhook handler error: ${error.message}`);
        }
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

        if (session.payment_status === "paid") {
            this.logger.info(`Payment completed for order: ${orderId}`);
            await this.orderService.updatePaymentStatus(
                orderId,
                "paid",
                session.id
            );
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
        await this.orderService.updatePaymentStatus(orderId, "failed");
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
        await this.orderService.updatePaymentStatus(orderId, "failed");
    }
}
