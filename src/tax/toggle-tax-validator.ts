import { body } from "express-validator";

export default [
    body("taxName")
        .exists()
        .withMessage("Tax name is required")
        .isString()
        .withMessage("Tax name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Tax name cannot be empty"),
    body("isActive")
        .exists()
        .withMessage("isActive is required")
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
