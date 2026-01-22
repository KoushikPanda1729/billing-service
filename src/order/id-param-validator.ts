import { param } from "express-validator";

export default [
    param("id")
        .exists()
        .withMessage("Order ID is required")
        .trim()
        .notEmpty()
        .withMessage("Order ID cannot be empty"),
];
