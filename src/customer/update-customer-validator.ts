import { body } from "express-validator";

export default [
    body("userId")
        .optional()
        .isString()
        .withMessage("User ID must be a string")
        .notEmpty()
        .withMessage("User ID cannot be empty"),
    body("firstName")
        .optional()
        .isString()
        .withMessage("First name must be a string")
        .trim()
        .notEmpty()
        .withMessage("First name cannot be empty"),
    body("lastName")
        .optional()
        .isString()
        .withMessage("Last name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Last name cannot be empty"),
    body("email")
        .optional()
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
    body("address")
        .not()
        .exists()
        .withMessage(
            "Address updates not allowed here. Use POST/PUT/DELETE /customers/:id/addresses endpoints"
        ),
];
