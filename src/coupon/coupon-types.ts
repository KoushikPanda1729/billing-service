export interface Coupon {
    _id?: string;
    title: string;
    code: string;
    discount: number; // Percentage value (e.g., 10 for 10%)
    validUpto: Date;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}
