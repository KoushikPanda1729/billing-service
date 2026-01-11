import { body } from "express-validator";

export default [
    body("text")
        .optional()
        .isString()
        .withMessage("Address text must be a string")
        .trim()
        .notEmpty()
        .withMessage("Address text cannot be empty"),
    body("isDefault")
        .optional()
        .isBoolean()
        .withMessage("isDefault must be a boolean"),
];
