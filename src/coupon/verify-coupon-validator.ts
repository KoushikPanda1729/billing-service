import { body } from "express-validator";

export default [
    body("code")
        .exists()
        .withMessage("Coupon code is required")
        .isString()
        .withMessage("Code must be a string")
        .trim()
        .notEmpty()
        .withMessage("Code cannot be empty"),
    body("tenantId")
        .exists()
        .withMessage("Tenant ID is required")
        .isString()
        .withMessage("Tenant ID must be a string")
        .trim()
        .notEmpty()
        .withMessage("Tenant ID cannot be empty"),
];
