import { body } from "express-validator";

export const initiatePaymentValidator = [
    body("orderId")
        .exists()
        .withMessage("Order ID is required")
        .isString()
        .withMessage("Order ID must be a string")
        .notEmpty()
        .withMessage("Order ID cannot be empty"),
    body("currency")
        .optional()
        .isString()
        .withMessage("Currency must be a string")
        .isIn(["INR", "USD", "EUR"])
        .withMessage("Invalid currency"),
];

export const verifyPaymentValidator = [
    body("razorpay_order_id")
        .exists()
        .withMessage("Razorpay order ID is required")
        .isString()
        .withMessage("Razorpay order ID must be a string"),
    body("razorpay_payment_id")
        .exists()
        .withMessage("Razorpay payment ID is required")
        .isString()
        .withMessage("Razorpay payment ID must be a string"),
    body("razorpay_signature")
        .exists()
        .withMessage("Razorpay signature is required")
        .isString()
        .withMessage("Razorpay signature must be a string"),
    body("orderId")
        .exists()
        .withMessage("Order ID is required")
        .isString()
        .withMessage("Order ID must be a string"),
];

export const refundPaymentValidator = [
    body("orderId")
        .exists()
        .withMessage("Order ID is required")
        .isString()
        .withMessage("Order ID must be a string"),
    body("amount")
        .optional()
        .isNumeric()
        .withMessage("Amount must be a number")
        .custom((value) => value > 0)
        .withMessage("Amount must be greater than 0"),
];
