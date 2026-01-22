import type { TaxConfiguration, TaxComponent } from "./tax-types";
import type { Model } from "mongoose";

export class TaxService {
    constructor(private taxConfigModel: Model<TaxConfiguration>) {}

    async create(tenantId: string, taxes: TaxComponent[]) {
        const taxConfig = new this.taxConfigModel({ tenantId, taxes });
        return taxConfig.save();
    }

    async getByTenantId(tenantId: string) {
        const taxConfig = await this.taxConfigModel.findOne({ tenantId });
        return taxConfig;
    }

    async update(tenantId: string, taxes: TaxComponent[]) {
        const taxConfig = await this.taxConfigModel.findOneAndUpdate(
            { tenantId },
            { taxes },
            { new: true, runValidators: true }
        );
        return taxConfig;
    }

    async upsert(tenantId: string, taxes: TaxComponent[]) {
        const taxConfig = await this.taxConfigModel.findOneAndUpdate(
            { tenantId },
            { taxes },
            { new: true, upsert: true, runValidators: true }
        );
        return taxConfig;
    }

    async toggleTax(tenantId: string, taxName: string, isActive: boolean) {
        const taxConfig = await this.taxConfigModel.findOneAndUpdate(
            { tenantId, "taxes.name": taxName },
            { $set: { "taxes.$.isActive": isActive } },
            { new: true }
        );
        return taxConfig;
    }

    async delete(tenantId: string) {
        const taxConfig = await this.taxConfigModel.findOneAndDelete({
            tenantId,
        });
        return taxConfig;
    }

    async getActiveTaxes(tenantId: string): Promise<TaxComponent[]> {
        const taxConfig = await this.taxConfigModel.findOne({ tenantId });
        if (!taxConfig) {
            return [];
        }
        return taxConfig.taxes.filter((tax) => tax.isActive);
    }
}
