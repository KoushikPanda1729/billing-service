import {
    Router,
    type Request,
    type Response,
    type NextFunction,
} from "express";
import { CouponController } from "./coupon-controller";
import { CouponService } from "./coupon-service";
import logger from "../config/logger";
import { asyncHandler } from "../common/utils/asyncHandler";
import { authenticate } from "../common/middleware/authenticate";
import { authorize } from "../common/middleware/authorize";
import { Roles } from "../common/constants/roles";
import idParamValidator from "./id-param-validator";
import couponValidator from "./coupon-validator";
import updateCouponValidator from "./update-coupon-validator";
import verifyCouponValidator from "./verify-coupon-validator";
import CouponModel from "./coupon-model";

const router = Router();

const couponService = new CouponService(CouponModel);

const couponController = new CouponController(couponService, logger);

router.get(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        couponController.getAll(req, res, next)
    )
);

router.get(
    "/:id",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    idParamValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        couponController.getById(req, res, next)
    )
);

router.post(
    "/",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    couponValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        couponController.create(req, res, next)
    )
);

router.put(
    "/:id",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    idParamValidator,
    updateCouponValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        couponController.update(req, res, next)
    )
);

router.delete(
    "/:id",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER]),
    idParamValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        couponController.delete(req, res, next)
    )
);

router.post(
    "/verify",
    authenticate,
    authorize([Roles.ADMIN, Roles.MANAGER, Roles.CUSTOMER]),
    verifyCouponValidator,
    asyncHandler((req: Request, res: Response, next: NextFunction) =>
        couponController.verify(req, res, next)
    )
);

export default router;
