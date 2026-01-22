import { body } from "express-validator";

export default [
    body("address")
        .exists()
        .withMessage("Address is required")
        .isString()
        .withMessage("Address must be a string")
        .trim()
        .notEmpty()
        .withMessage("Address cannot be empty"),
    body("items")
        .exists()
        .withMessage("Items are required")
        .isArray({ min: 1 })
        .withMessage("Items must be a non-empty array"),
    body("items.*._id")
        .exists()
        .withMessage("Item ID is required")
        .isString()
        .withMessage("Item ID must be a string"),
    body("items.*.name")
        .exists()
        .withMessage("Item name is required")
        .isString()
        .withMessage("Item name must be a string"),
    body("items.*.image")
        .exists()
        .withMessage("Item image is required")
        .isString()
        .withMessage("Item image must be a string"),
    body("items.*.qty")
        .exists()
        .withMessage("Item quantity is required")
        .isInt({ min: 1 })
        .withMessage("Item quantity must be at least 1"),
    body("items.*.priceConfiguration")
        .exists()
        .withMessage("Price configuration is required")
        .isObject()
        .withMessage("Price configuration must be an object"),
    body("items.*.toppings")
        .optional()
        .isArray()
        .withMessage("Toppings must be an array"),
    body("items.*.toppings.*._id")
        .optional()
        .isString()
        .withMessage("Topping ID must be a string"),
    body("items.*.toppings.*.name")
        .optional()
        .isString()
        .withMessage("Topping name must be a string"),
    body("items.*.toppings.*.image")
        .optional()
        .isString()
        .withMessage("Topping image must be a string"),
    body("items.*.toppings.*.price")
        .optional()
        .isNumeric()
        .withMessage("Topping price must be a number"),
    body("items.*.totalPrice")
        .exists()
        .withMessage("Item total price is required")
        .isNumeric()
        .withMessage("Item total price must be a number"),
    body("couponCode")
        .optional()
        .isString()
        .withMessage("Coupon code must be a string")
        .trim(),
    body("discount")
        .optional()
        .isNumeric()
        .withMessage("Discount must be a number"),
    body("total")
        .exists()
        .withMessage("Total is required")
        .isNumeric()
        .withMessage("Total must be a number"),
    body("paymentMode")
        .exists()
        .withMessage("Payment mode is required")
        .isIn(["card", "cash", "upi", "netbanking", "wallet"])
        .withMessage(
            "Payment mode must be one of: card, cash, upi, netbanking, wallet"
        ),
    body("tenantId")
        .optional()
        .isString()
        .withMessage("Tenant ID must be a string")
        .trim()
        .notEmpty()
        .withMessage("Tenant ID cannot be empty"),
];
