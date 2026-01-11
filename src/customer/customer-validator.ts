import { body } from "express-validator";

export default [
    body("address")
        .optional()
        .isArray()
        .withMessage("Address must be an array"),
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
