import { param } from "express-validator";

export default [
    param("id")
        .exists()
        .withMessage("Customer ID is required")
        .isMongoId()
        .withMessage("Invalid customer ID"),
];
