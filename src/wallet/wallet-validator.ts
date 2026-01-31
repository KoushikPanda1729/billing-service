import { body } from "express-validator";

export const calculateCashbackValidator = [
    body("orderAmount")
        .exists()
        .withMessage("Order amount is required")
        .isNumeric()
        .withMessage("Order amount must be a number")
        .custom((value) => value > 0)
        .withMessage("Order amount must be greater than 0"),
    body("walletAmountUsed")
        .optional()
        .isNumeric()
        .withMessage("Wallet amount must be a number")
        .custom((value) => value >= 0)
        .withMessage("Wallet amount cannot be negative"),
];
