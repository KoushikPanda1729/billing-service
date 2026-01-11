import { param } from "express-validator";

export default [
    param("id")
        .exists()
        .withMessage("Coupon ID is required")
        .isMongoId()
        .withMessage("Invalid coupon ID"),
];
