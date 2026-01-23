// Order value tier - higher order value = lower delivery charge
export interface OrderValueTier {
    minOrderValue: number; // Order above this value
    deliveryCharge: number; // Fixed delivery charge for this tier
    // For future: perKmCharge when distance-based is enabled
    perKmCharge?: number;
}

// Distance configuration - for future use with OSRM
export interface DistanceConfig {
    enabled: boolean; // Toggle distance-based pricing
    freeKm: number; // First X km free
    maxDistanceKm: number; // Max delivery distance
}

export interface DeliveryConfiguration {
    _id?: string;
    tenantId: string;
    isActive: boolean; // Toggle delivery charges on/off

    // Order value based tiers
    orderValueTiers: OrderValueTier[];

    // Free delivery threshold (overrides tiers if order >= this amount)
    freeDeliveryThreshold?: number;

    // Distance configuration - for future OSRM integration
    distanceConfig?: DistanceConfig;

    createdAt?: Date;
    updatedAt?: Date;
}

// Result of delivery charge calculation
export interface DeliveryChargeResult {
    deliveryCharge: number;
    isFreeDelivery: boolean;
    freeDeliveryReason?: string; // "threshold" | "tier" | "disabled"
    appliedTier?: OrderValueTier;
    // For future distance-based
    distanceKm?: number;
    distanceCharge?: number;
}
