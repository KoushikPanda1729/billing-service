import { body } from "express-validator";

export default [
    body("taxes")
        .exists()
        .withMessage("Taxes array is required")
        .isArray()
        .withMessage("Taxes must be an array"),
    body("taxes.*.name")
        .exists()
        .withMessage("Tax name is required")
        .isString()
        .withMessage("Tax name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Tax name cannot be empty"),
    body("taxes.*.rate")
        .exists()
        .withMessage("Tax rate is required")
        .isFloat({ min: 0, max: 100 })
        .withMessage("Tax rate must be a number between 0 and 100"),
    body("taxes.*.isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    body("tenantId")
        .optional()
        .isString()
        .withMessage("Tenant ID must be a string")
        .trim()
        .notEmpty()
        .withMessage("Tenant ID cannot be empty"),
];
