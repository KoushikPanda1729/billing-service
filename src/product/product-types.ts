export interface PriceConfiguration {
    priceType: "base" | "additional";
    availableOptions: Record<string, number>;
}

export interface Attribute {
    name: string;
    value: string | boolean;
}

export interface Product {
    _id: string;
    name: string;
    description: string;
    image: string;
    category: string;
    priceConfiguration: Record<string, PriceConfiguration>;
    attributes: Attribute[];
    tenantId: string;
    isPublished: boolean;
}
