import { body } from "express-validator";

export default [
    body("userId")
        .optional()
        .isString()
        .withMessage("User ID must be a string")
        .notEmpty()
        .withMessage("User ID cannot be empty"),
    body("firstName")
        .optional()
        .isString()
        .withMessage("First name must be a string")
        .trim()
        .notEmpty()
        .withMessage("First name cannot be empty"),
    body("lastName")
        .optional()
        .isString()
        .withMessage("Last name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Last name cannot be empty"),
    body("email")
        .optional()
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
    body("address")
        .optional()
        .isArray({ min: 1 })
        .withMessage("Address must be an array with at least one address"),
    body("address.*.text")
        .optional()
        .isString()
        .withMessage("Address text must be a string")
        .trim()
        .notEmpty()
        .withMessage("Address text cannot be empty"),
    body("address.*.isDefault")
        .optional()
        .isBoolean()
        .withMessage("isDefault must be a boolean"),
];
