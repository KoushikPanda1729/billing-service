import type {
    DeliveryConfiguration,
    DeliveryChargeResult,
} from "./delivery-types";
import type { Model } from "mongoose";

export class DeliveryService {
    constructor(private deliveryConfigModel: Model<DeliveryConfiguration>) {}

    async create(
        tenantId: string,
        config: Omit<
            DeliveryConfiguration,
            "_id" | "tenantId" | "createdAt" | "updatedAt"
        >
    ) {
        const deliveryConfig = new this.deliveryConfigModel({
            tenantId,
            ...config,
        });
        return deliveryConfig.save();
    }

    async getByTenantId(tenantId: string) {
        const config = await this.deliveryConfigModel.findOne({ tenantId });
        return config;
    }

    async update(
        tenantId: string,
        config: Partial<Omit<DeliveryConfiguration, "_id" | "tenantId">>
    ) {
        const deliveryConfig = await this.deliveryConfigModel.findOneAndUpdate(
            { tenantId },
            config,
            { new: true, runValidators: true }
        );
        return deliveryConfig;
    }

    async upsert(
        tenantId: string,
        config: Omit<
            DeliveryConfiguration,
            "_id" | "tenantId" | "createdAt" | "updatedAt"
        >
    ) {
        const deliveryConfig = await this.deliveryConfigModel.findOneAndUpdate(
            { tenantId },
            { tenantId, ...config },
            { new: true, upsert: true, runValidators: true }
        );
        return deliveryConfig;
    }

    async toggleActive(tenantId: string, isActive: boolean) {
        const config = await this.deliveryConfigModel.findOneAndUpdate(
            { tenantId },
            { isActive },
            { new: true }
        );
        return config;
    }

    async delete(tenantId: string) {
        const config = await this.deliveryConfigModel.findOneAndDelete({
            tenantId,
        });
        return config;
    }

    /**
     * Calculate delivery charge based on order value
     * Future: Will support distance-based pricing when OSRM is integrated
     */
    calculateDeliveryCharge(
        config: DeliveryConfiguration,
        orderSubTotal: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _distanceKm?: number // Future param for distance-based pricing
    ): DeliveryChargeResult {
        // If delivery is disabled, return 0
        if (!config.isActive) {
            return {
                deliveryCharge: 0,
                isFreeDelivery: true,
                freeDeliveryReason: "disabled",
            };
        }

        // Check free delivery threshold first
        if (
            config.freeDeliveryThreshold &&
            orderSubTotal >= config.freeDeliveryThreshold
        ) {
            return {
                deliveryCharge: 0,
                isFreeDelivery: true,
                freeDeliveryReason: "threshold",
            };
        }

        // Find applicable tier (highest minOrderValue that's <= orderSubTotal)
        const sortedTiers = [...config.orderValueTiers].sort(
            (a, b) => b.minOrderValue - a.minOrderValue
        );

        const applicableTier = sortedTiers.find(
            (tier) => orderSubTotal >= tier.minOrderValue
        );

        if (!applicableTier) {
            // No tier found, check if tiers exist
            if (config.orderValueTiers.length === 0) {
                // No tiers configured, free delivery
                return {
                    deliveryCharge: 0,
                    isFreeDelivery: true,
                    freeDeliveryReason: "tier",
                };
            }

            // Use the lowest tier
            const lowestTier = config.orderValueTiers.reduce((min, tier) =>
                tier.minOrderValue < min.minOrderValue ? tier : min
            );

            if (lowestTier.deliveryCharge === 0) {
                return {
                    deliveryCharge: 0,
                    isFreeDelivery: true,
                    freeDeliveryReason: "tier",
                    appliedTier: lowestTier,
                };
            }

            return {
                deliveryCharge: lowestTier.deliveryCharge,
                isFreeDelivery: false,
                appliedTier: lowestTier,
            };
        }

        // Check if this tier has free delivery
        if (applicableTier.deliveryCharge === 0) {
            return {
                deliveryCharge: 0,
                isFreeDelivery: true,
                freeDeliveryReason: "tier",
                appliedTier: applicableTier,
            };
        }

        // Calculate delivery charge
        const deliveryCharge = applicableTier.deliveryCharge;

        // Future: Add distance-based calculation here when OSRM is integrated
        // if (config.distanceConfig?.enabled && distanceKm !== undefined) {
        //     const chargeableKm = Math.max(0, distanceKm - config.distanceConfig.freeKm);
        //     const perKmCharge = applicableTier.perKmCharge || 0;
        //     deliveryCharge += chargeableKm * perKmCharge;
        // }

        return {
            deliveryCharge: Math.round(deliveryCharge * 100) / 100,
            isFreeDelivery: false,
            appliedTier: applicableTier,
        };
    }

    /**
     * Get delivery charge for an order
     */
    async getDeliveryChargeForOrder(
        tenantId: string,
        orderSubTotal: number,
        // Future params
        _distanceKm?: number
    ): Promise<DeliveryChargeResult> {
        const config = await this.getByTenantId(tenantId);

        if (!config) {
            // No delivery config, free delivery
            return {
                deliveryCharge: 0,
                isFreeDelivery: true,
                freeDeliveryReason: "disabled",
            };
        }

        return this.calculateDeliveryCharge(config, orderSubTotal, _distanceKm);
    }
}
