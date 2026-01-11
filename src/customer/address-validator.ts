import { body } from "express-validator";

export default [
    body("text")
        .exists()
        .withMessage("Address text is required")
        .isString()
        .withMessage("Address text must be a string")
        .trim()
        .notEmpty()
        .withMessage("Address text cannot be empty"),
    body("isDefault")
        .exists()
        .withMessage("isDefault is required")
        .isBoolean()
        .withMessage("isDefault must be a boolean"),
];
