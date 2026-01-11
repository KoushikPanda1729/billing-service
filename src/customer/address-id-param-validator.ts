import { param } from "express-validator";

export default [
    param("id")
        .exists()
        .withMessage("Customer ID is required")
        .isMongoId()
        .withMessage("Invalid customer ID"),
    param("addressId")
        .exists()
        .withMessage("Address ID is required")
        .isMongoId()
        .withMessage("Invalid address ID"),
];
