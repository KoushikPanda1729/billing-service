import { body } from "express-validator";

export default [
    body("status")
        .exists()
        .withMessage("Status is required")
        .isIn([
            "pending",
            "confirmed",
            "preparing",
            "out_for_delivery",
            "delivered",
            "cancelled",
        ])
        .withMessage(
            "Status must be one of: pending, confirmed, preparing, out_for_delivery, delivered, cancelled"
        ),
];
