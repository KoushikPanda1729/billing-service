import { Router } from "express";
import { WebhookController } from "./webhook-controller";
import { OrderService } from "../order/order-service";
import OrderModel from "../order/order-model";
import { Config } from "../config";
import logger from "../config/logger";
import { createMessageBroker } from "../common/services/broker/MessageBrokerFactory";
import { WalletService } from "../wallet/wallet-service";
import { WalletModel, WalletTransactionModel } from "../wallet/wallet-model";

const router = Router();

const orderService = new OrderService(OrderModel);
const broker = createMessageBroker();
const walletService = new WalletService(
    WalletModel,
    WalletTransactionModel,
    logger
);
const webhookController = new WebhookController(
    Config.STRIPE_SECRET_KEY,
    Config.STRIPE_WEBHOOK_SECRET,
    orderService,
    logger,
    broker,
    walletService
);

// Stripe webhook endpoint - no authentication (Stripe sends directly)
router.post("/", async (req, res) => {
    await webhookController.handleWebhook(req, res);
});

export default router;
