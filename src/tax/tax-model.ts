import mongoose from "mongoose";
import type { TaxConfiguration } from "./tax-types";

const taxComponentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        rate: { type: Number, required: true, min: 0, max: 100 },
        isActive: { type: Boolean, default: true },
    },
    { _id: false }
);

const taxConfigurationSchema = new mongoose.Schema<TaxConfiguration>(
    {
        tenantId: { type: String, required: true, unique: true },
        taxes: { type: [taxComponentSchema], default: [] },
    },
    {
        timestamps: true,
    }
);

taxConfigurationSchema.index({ tenantId: 1 }, { unique: true });

const TaxConfigurationModel = mongoose.model<TaxConfiguration>(
    "TaxConfiguration",
    taxConfigurationSchema
);

export default TaxConfigurationModel;
