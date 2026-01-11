import {
    Router,
    type Request,
    type Response,
    type NextFunction,
} from "express";
import { CustomerController } from "./customer-controller";
import { CustomerService } from "./customer-service";
import logger from "../config/logger";
import { asyncHandler } from "../common/utils/asyncHandler";
import { authenticate } from "../common/middleware/authenticate";
import { authorize } from "../common/middleware/authorize";
import { Roles } from "../common/constants/roles";
import idParamValidator from "./id-param-validator";
import customerValidator from "./customer-validator";
import updateCustomerValidator from "./update-customer-validator";

const router = Router();

const customerService = new CustomerService();

const customerController = new CustomerController(customerService, logger);

router.get(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        customerController.getAll(req, res, next)
    )
);

router.get(
    "/:id",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    idParamValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        customerController.getById(req, res, next)
    )
);

router.post(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    customerValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        customerController.create(req, res, next)
    )
);

router.put(
    "/:id",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    idParamValidator,
    updateCustomerValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        customerController.update(req, res, next)
    )
);

router.delete(
    "/:id",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    idParamValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        customerController.delete(req, res, next)
    )
);

export default router;
