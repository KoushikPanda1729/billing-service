import { Router } from "express";
import { WebhookController } from "./webhook-controller";
import { OrderService } from "../order/order-service";
import OrderModel from "../order/order-model";
import { Config } from "../config";
import logger from "../config/logger";

const router = Router();

const orderService = new OrderService(OrderModel);
const webhookController = new WebhookController(
    Config.STRIPE_SECRET_KEY,
    Config.STRIPE_WEBHOOK_SECRET,
    orderService,
    logger
);

// Stripe webhook endpoint - no authentication (Stripe sends directly)
router.post("/", async (req, res) => {
    await webhookController.handleWebhook(req, res);
});

export default router;
