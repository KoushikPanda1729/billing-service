import { body } from "express-validator";

export default [
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    body("orderValueTiers")
        .exists()
        .withMessage("orderValueTiers is required")
        .isArray()
        .withMessage("orderValueTiers must be an array"),
    body("orderValueTiers.*.minOrderValue")
        .exists()
        .withMessage("minOrderValue is required")
        .isFloat({ min: 0 })
        .withMessage("minOrderValue must be a non-negative number"),
    body("orderValueTiers.*.deliveryCharge")
        .exists()
        .withMessage("deliveryCharge is required")
        .isFloat({ min: 0 })
        .withMessage("deliveryCharge must be a non-negative number"),
    body("orderValueTiers.*.perKmCharge")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("perKmCharge must be a non-negative number"),
    body("freeDeliveryThreshold")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("freeDeliveryThreshold must be a non-negative number"),
    body("tenantId")
        .optional()
        .isString()
        .withMessage("Tenant ID must be a string")
        .trim()
        .notEmpty()
        .withMessage("Tenant ID cannot be empty"),
];
