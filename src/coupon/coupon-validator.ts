import { body } from "express-validator";

export default [
    body("title")
        .exists()
        .withMessage("Title is required")
        .isString()
        .withMessage("Title must be a string")
        .trim()
        .notEmpty()
        .withMessage("Title cannot be empty"),
    body("code")
        .exists()
        .withMessage("Code is required")
        .isString()
        .withMessage("Code must be a string")
        .trim()
        .notEmpty()
        .withMessage("Code cannot be empty")
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Code can only contain letters, numbers, and underscores"),
    body("discount")
        .exists()
        .withMessage("Discount is required")
        .isFloat({ min: 0, max: 100 })
        .withMessage("Discount must be a number between 0 and 100"),
    body("validUpto")
        .exists()
        .withMessage("Valid upto date is required")
        .isISO8601()
        .withMessage("Valid upto must be a valid date")
        .custom((value: string) => {
            const date = new Date(value);
            if (date <= new Date()) {
                throw new Error("Valid upto date must be in the future");
            }
            return true;
        }),
    body("tenantId")
        .optional()
        .isString()
        .withMessage("Tenant ID must be a string")
        .trim()
        .notEmpty()
        .withMessage("Tenant ID cannot be empty"),
];
