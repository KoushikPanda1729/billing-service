import { body } from "express-validator";

export default [
    body("address")
        .exists()
        .withMessage("Address is required")
        .isArray({ min: 1 })
        .withMessage("Address must be an array with at least one address"),
    body("address.*.text")
        .exists()
        .withMessage("Address text is required")
        .isString()
        .withMessage("Address text must be a string")
        .trim()
        .notEmpty()
        .withMessage("Address text cannot be empty"),
    body("address.*.isDefault")
        .exists()
        .withMessage("isDefault is required")
        .isBoolean()
        .withMessage("isDefault must be a boolean"),
];
