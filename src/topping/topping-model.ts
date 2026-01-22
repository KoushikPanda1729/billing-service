import mongoose from "mongoose";
import type { Topping } from "./topping-types";

const toppingSchema = new mongoose.Schema<Topping>(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        tenantId: { type: String, required: true },
        isPublished: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

const ToppingModel = mongoose.model<Topping>("Topping", toppingSchema);

export default ToppingModel;
