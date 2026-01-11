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
import addressValidator from "./address-validator";
import updateAddressValidator from "./update-address-validator";
import addressIdParamValidator from "./address-id-param-validator";
import CustomerModel from "./customer-model";

const router = Router();

const customerService = new CustomerService(CustomerModel);

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

// Address management routes
router.post(
    "/:id/addresses",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    idParamValidator,
    addressValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        customerController.addAddress(req, res, next)
    )
);

router.put(
    "/:id/addresses/:addressId",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    addressIdParamValidator,
    updateAddressValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        customerController.updateAddress(req, res, next)
    )
);

router.delete(
    "/:id/addresses/:addressId",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    addressIdParamValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        customerController.deleteAddress(req, res, next)
    )
);

export default router;
