import mongoose from "mongoose";
import type { DeliveryConfiguration } from "./delivery-types";

const orderValueTierSchema = new mongoose.Schema(
    {
        minOrderValue: { type: Number, required: true, min: 0 },
        deliveryCharge: { type: Number, required: true, min: 0 },
        // For future distance-based pricing
        perKmCharge: { type: Number, min: 0 },
    },
    { _id: false }
);

// For future OSRM integration
const distanceConfigSchema = new mongoose.Schema(
    {
        enabled: { type: Boolean, default: false },
        freeKm: { type: Number, default: 0, min: 0 },
        maxDistanceKm: { type: Number, default: 15, min: 1 },
    },
    { _id: false }
);

const deliveryConfigurationSchema = new mongoose.Schema<DeliveryConfiguration>(
    {
        tenantId: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        orderValueTiers: { type: [orderValueTierSchema], default: [] },
        freeDeliveryThreshold: { type: Number, min: 0 },
        // For future distance-based pricing
        distanceConfig: { type: distanceConfigSchema },
    },
    {
        timestamps: true,
    }
);

deliveryConfigurationSchema.index({ tenantId: 1 }, { unique: true });

const DeliveryConfigurationModel = mongoose.model<DeliveryConfiguration>(
    "DeliveryConfiguration",
    deliveryConfigurationSchema
);

export default DeliveryConfigurationModel;
