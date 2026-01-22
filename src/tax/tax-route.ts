import {
    Router,
    type Request,
    type Response,
    type NextFunction,
} from "express";
import { TaxController } from "./tax-controller";
import { TaxService } from "./tax-service";
import logger from "../config/logger";
import { asyncHandler } from "../common/utils/asyncHandler";
import { authenticate } from "../common/middleware/authenticate";
import { authorize } from "../common/middleware/authorize";
import { Roles } from "../common/constants/roles";
import taxValidator from "./tax-validator";
import toggleTaxValidator from "./toggle-tax-validator";
import TaxConfigurationModel from "./tax-model";

const router = Router();

const taxService = new TaxService(TaxConfigurationModel);
const taxController = new TaxController(taxService, logger);

// Get tax configuration for tenant
router.get(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        taxController.getByTenant(req, res, next)
    )
);

// Create tax configuration
router.post(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    taxValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        taxController.create(req, res, next)
    )
);

// Update tax configuration (upsert)
router.put(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    taxValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        taxController.update(req, res, next)
    )
);

// Toggle individual tax active/inactive
router.patch(
    "/toggle",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    toggleTaxValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        taxController.toggleTax(req, res, next)
    )
);

// Delete tax configuration
router.delete(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        taxController.delete(req, res, next)
    )
);

export default router;
