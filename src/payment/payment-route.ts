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

const router = Router();

// Initialize payment gateway
const gatewayFactory = new PaymentGatewayFactory({
    razorpay: {
        keyId: Config.RAZORPAY_KEY_ID,
        keySecret: Config.RAZORPAY_KEY_SECRET,
    },
    stripe: {
        secretKey: Config.STRIPE_SECRET_KEY,
    },
});

const paymentGateway = gatewayFactory.create(Config.PAYMENT_GATEWAY);
const orderService = new OrderService(OrderModel);
const paymentService = new PaymentService(paymentGateway, orderService);
const paymentController = new PaymentController(paymentService, logger);

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

// Get payment details - admin/manager only
router.get(
    "/:paymentId",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    asyncHandler(async (req, res, next) => {
        await paymentController.getDetails(req, res, next);
    })
);

export default router;
