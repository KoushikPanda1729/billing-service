import mongoose from "mongoose";
import type { Product } from "./product-types";

const priceConfigurationSchema = new mongoose.Schema(
    {
        priceType: {
            type: String,
            enum: ["base", "additional"],
            required: true,
        },
        availableOptions: { type: Map, of: Number, required: true },
    },
    { _id: false }
);

const attributeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true },
    },
    { _id: false }
);

const productSchema = new mongoose.Schema<Product>(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        image: { type: String, required: true },
        category: { type: String, required: true },
        priceConfiguration: { type: Map, of: priceConfigurationSchema },
        attributes: [attributeSchema],
        tenantId: { type: String, required: true },
        isPublished: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

const ProductModel = mongoose.model<Product>("Product", productSchema);

export default ProductModel;
