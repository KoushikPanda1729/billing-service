export interface TaxComponent {
    name: string; // "CGST", "SGST", "VAT", "Service Tax"
    rate: number; // percentage (e.g., 9 for 9%)
    isActive: boolean; // toggle to enable/disable this tax
}

export interface TaxConfiguration {
    _id?: string;
    tenantId: string;
    taxes: TaxComponent[];
    createdAt?: Date;
    updatedAt?: Date;
}

// For storing in order
export interface TaxBreakdownItem {
    name: string;
    rate: number;
    amount: number;
}
