import { Router } from "express";
import { PaymentController } from "./payment-controller";
import { PaymentService } from "./payment-service";
import { PaymentGatewayFactory } from "./gateways/payment-gateway-factory";
import { OrderService } from "../order/order-service";
import OrderModel from "../order/order-model";
import { authenticate } from "../common/middleware/authenticate";
import { asyncHandler } from "../common/utils/asyncHandler";
import { Config } from "../config";
import logger from "../config/logger";
import {
    initiatePaymentValidator,
    verifyPaymentValidator,
    refundPaymentValidator,
} from "./payment-validator";
import { authorize } from "../common/middleware/authorize";
import { Roles } from "../common/constants/roles";
import { createMessageBroker } from "../common/services/broker/MessageBrokerFactory";
import { WalletService } from "../wallet/wallet-service";
import { WalletModel, WalletTransactionModel } from "../wallet/wallet-model";

const router = Router();

// Initialize payment gateway
const gatewayFactory = new PaymentGatewayFactory({
    razorpay: {
        keyId: Config.RAZORPAY_KEY_ID,
        keySecret: Config.RAZORPAY_KEY_SECRET,
    },
    stripe: {
        secretKey: Config.STRIPE_SECRET_KEY,
        successUrl: Config.STRIPE_SUCCESS_URL,
        cancelUrl: Config.STRIPE_CANCEL_URL,
    },
});

const paymentGateway = gatewayFactory.create(Config.PAYMENT_GATEWAY);
const orderService = new OrderService(OrderModel);
const paymentService = new PaymentService(paymentGateway, orderService);
const broker = createMessageBroker();
const walletService = new WalletService(
    WalletModel,
    WalletTransactionModel,
    logger
);
const paymentController = new PaymentController(
    paymentService,
    logger,
    broker,
    walletService
);

// Initiate payment - authenticated users only
router.post(
    "/initiate",
    authenticate,
    initiatePaymentValidator,
    asyncHandler(async (req, res, next) => {
        await paymentController.initiate(req, res, next);
    })
);

// Verify payment callback - this can be called from frontend after payment
router.post(
    "/verify",
    authenticate,
    verifyPaymentValidator,
    asyncHandler(async (req, res, next) => {
        await paymentController.verify(req, res, next);
    })
);

// Refund payment - admin/manager only
router.post(
    "/refund",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    refundPaymentValidator,
    asyncHandler(async (req, res, next) => {
        await paymentController.refund(req, res, next);
    })
);

// Get refunds for an order - admin/manager only
router.get(
    "/refunds/:orderId",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    asyncHandler(async (req, res, next) => {
        await paymentController.getRefunds(req, res, next);
    })
);

// Get payment details - public route for payment success page
router.get(
    "/:paymentId",
    asyncHandler(async (req, res, next) => {
        await paymentController.getDetails(req, res, next);
    })
);

export default router;
