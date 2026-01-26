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
    body("orderId")
        .exists()
        .withMessage("Order ID is required")
        .isString()
        .withMessage("Order ID must be a string"),
    body("sessionId")
        .optional()
        .isString()
        .withMessage("Session ID must be a string"),
    // Razorpay fields (optional - used when gateway is razorpay)
    body("razorpay_order_id")
        .optional()
        .isString()
        .withMessage("Razorpay order ID must be a string"),
    body("razorpay_payment_id")
        .optional()
        .isString()
        .withMessage("Razorpay payment ID must be a string"),
    body("razorpay_signature")
        .optional()
        .isString()
        .withMessage("Razorpay signature must be a string"),
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
