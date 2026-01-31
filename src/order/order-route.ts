import {
    Router,
    type Request,
    type Response,
    type NextFunction,
} from "express";
import { OrderController } from "./order-controller";
import { OrderService } from "./order-service";
import { CouponService } from "../coupon/coupon-service";
import { IdempotencyService } from "../idempotency/idempotency-service";
import logger from "../config/logger";
import { asyncHandler } from "../common/utils/asyncHandler";
import { authenticate } from "../common/middleware/authenticate";
import { authorize } from "../common/middleware/authorize";
import { Roles } from "../common/constants/roles";
import idParamValidator from "./id-param-validator";
import orderValidator from "./order-validator";
import updateStatusValidator from "./update-status-validator";
import OrderModel from "./order-model";
import CouponModel from "../coupon/coupon-model";
import IdempotencyModel from "../idempotency/idempotency-model";
import { idempotencyMiddleware } from "../idempotency";
import { createMessageBroker } from "../common/services/broker/MessageBrokerFactory";
import { WalletService } from "../wallet/wallet-service";
import { WalletModel, WalletTransactionModel } from "../wallet/wallet-model";

const router = Router();

const orderService = new OrderService(OrderModel);
const couponService = new CouponService(CouponModel);
const idempotencyService = new IdempotencyService(IdempotencyModel);
const broker = createMessageBroker();
const walletService = new WalletService(
    WalletModel,
    WalletTransactionModel,
    logger
);

const orderController = new OrderController(
    orderService,
    couponService,
    idempotencyService,
    logger,
    broker,
    walletService
);

// Get all orders (Admin, Manager can see tenant orders, Customer sees own orders)
router.get(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        orderController.getAll(req, res, next)
    )
);

// Get my orders (Customer convenience endpoint)
router.get(
    "/my-orders",
    authenticate,
    authorize([Roles.CUSTOMER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        orderController.getMyOrders(req, res, next)
    )
);

// Get order by ID
router.get(
    "/:id",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    idParamValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        orderController.getById(req, res, next)
    )
);

// Create order (with idempotency to prevent duplicate orders)
router.post(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    idempotencyMiddleware({ required: true }), // Requires x-idempotency-key header
    orderValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        orderController.create(req, res, next)
    )
);

// Update order status
router.patch(
    "/:id/status",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    idParamValidator,
    updateStatusValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        orderController.updateStatus(req, res, next)
    )
);

// Delete order (Admin, Manager only)
router.delete(
    "/:id",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    idParamValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        orderController.delete(req, res, next)
    )
);

export default router;
