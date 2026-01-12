import { param } from "express-validator";

export default [
    param("id")
        .exists()
        .withMessage("Customer ID is required")
        .trim()
        .notEmpty()
        .withMessage("Customer ID cannot be empty"),
];
