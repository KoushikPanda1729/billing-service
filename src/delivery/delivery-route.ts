import {
    Router,
    type Request,
    type Response,
    type NextFunction,
} from "express";
import { DeliveryController } from "./delivery-controller";
import { DeliveryService } from "./delivery-service";
import logger from "../config/logger";
import { asyncHandler } from "../common/utils/asyncHandler";
import { authenticate } from "../common/middleware/authenticate";
import { authorize } from "../common/middleware/authorize";
import { Roles } from "../common/constants/roles";
import deliveryValidator from "./delivery-validator";
import toggleDeliveryValidator from "./toggle-delivery-validator";
import DeliveryConfigurationModel from "./delivery-model";

const router = Router();

const deliveryService = new DeliveryService(DeliveryConfigurationModel);
const deliveryController = new DeliveryController(deliveryService, logger);

// Get delivery configuration for tenant
router.get(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        deliveryController.getByTenant(req, res, next)
    )
);

// Calculate delivery charge (public endpoint for checkout preview)
router.get(
    "/calculate",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        deliveryController.calculateCharge(req, res, next)
    )
);

// Create delivery configuration
router.post(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    deliveryValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        deliveryController.create(req, res, next)
    )
);

// Update delivery configuration (upsert)
router.put(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    deliveryValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        deliveryController.update(req, res, next)
    )
);

// Toggle delivery charges active/inactive
router.patch(
    "/toggle",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    toggleDeliveryValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        deliveryController.toggleActive(req, res, next)
    )
);

// Delete delivery configuration
router.delete(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        deliveryController.delete(req, res, next)
    )
);

export default router;
