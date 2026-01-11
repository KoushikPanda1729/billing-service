import type { Customer } from "./customer-types";
import type { AggregatePaginateModel, Model } from "mongoose";
import mongoose from "mongoose";

export class CustomerService {
    constructor(private customerModel: Model<Customer>) {}

    async create(customerData: Customer) {
        const customer = new this.customerModel(customerData);
        return customer.save();
    }

    async update(customerId: string, customerData: Partial<Customer>) {
        if (!mongoose.isValidObjectId(customerId)) {
            return null;
        }
        const customer = await this.customerModel.findByIdAndUpdate(
            customerId,
            customerData,
            { new: true, runValidators: true }
        );
        return customer;
    }

    async getAll(filters?: { q?: string; limit?: number; page?: number }) {
        const matchStage: Record<string, unknown> = {};

        if (filters?.q) {
            matchStage.$or = [
                { firstName: { $regex: filters.q, $options: "i" } },
                { lastName: { $regex: filters.q, $options: "i" } },
                { email: { $regex: filters.q, $options: "i" } },
            ];
        }

        const aggregate = this.customerModel.aggregate([
            { $match: matchStage },
        ]);

        const options = {
            page: filters?.page || 1,
            limit: filters?.limit || 10,
        };

        const result = await (
            this.customerModel as unknown as AggregatePaginateModel<Customer>
        ).aggregatePaginate(aggregate, options);

        return {
            data: result.docs,
            total: result.totalDocs,
            page: result.page || 1,
            limit: result.limit,
            totalPages: result.totalPages,
        };
    }

    async getById(customerId: string) {
        if (!mongoose.isValidObjectId(customerId)) {
            return null;
        }
        const customer = await this.customerModel.findById(customerId);
        return customer;
    }

    async delete(customerId: string) {
        if (!mongoose.isValidObjectId(customerId)) {
            return null;
        }
        const customer = await this.customerModel.findByIdAndDelete(customerId);
        return customer;
    }

    async addAddress(
        customerId: string,
        addressData: { text: string; isDefault: boolean }
    ) {
        if (!mongoose.isValidObjectId(customerId)) {
            return null;
        }

        // Check if address with same text already exists
        const existingCustomer = await this.customerModel.findById(customerId);
        if (!existingCustomer) {
            return null;
        }

        const addressExists = existingCustomer.address.some(
            (addr) =>
                addr.text.toLowerCase().trim() ===
                addressData.text.toLowerCase().trim()
        );

        if (addressExists) {
            throw new Error("Address already exists");
        }

        // If this address is set as default, unset all other defaults
        if (addressData.isDefault) {
            await this.customerModel.findByIdAndUpdate(customerId, {
                $set: { "address.$[].isDefault": false },
            });
        }

        const customer = await this.customerModel.findByIdAndUpdate(
            customerId,
            { $push: { address: addressData } },
            { new: true, runValidators: true }
        );
        return customer;
    }

    async updateAddress(
        customerId: string,
        addressId: string,
        addressData: { text?: string; isDefault?: boolean }
    ) {
        if (!mongoose.isValidObjectId(customerId)) {
            return null;
        }

        // If updating text, check if another address with same text already exists
        if (addressData.text) {
            const existingCustomer =
                await this.customerModel.findById(customerId);
            if (!existingCustomer) {
                return null;
            }

            const duplicateExists = existingCustomer.address.some(
                (addr) =>
                    String(addr._id) !== addressId &&
                    addr.text.toLowerCase().trim() ===
                        addressData.text?.toLowerCase().trim()
            );

            if (duplicateExists) {
                throw new Error("Address already exists");
            }
        }

        // If setting as default, unset all other defaults first
        if (addressData.isDefault) {
            await this.customerModel.findByIdAndUpdate(customerId, {
                $set: { "address.$[].isDefault": false },
            });
        }

        const updateFields: Record<string, unknown> = {};
        if (addressData.text !== undefined) {
            updateFields["address.$.text"] = addressData.text;
        }
        if (addressData.isDefault !== undefined) {
            updateFields["address.$.isDefault"] = addressData.isDefault;
        }

        const customer = await this.customerModel.findOneAndUpdate(
            { _id: customerId, "address._id": addressId },
            { $set: updateFields },
            { new: true, runValidators: true }
        );
        return customer;
    }

    async deleteAddress(customerId: string, addressId: string) {
        if (!mongoose.isValidObjectId(customerId)) {
            return null;
        }

        const customer = await this.customerModel.findByIdAndUpdate(
            customerId,
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );
        return customer;
    }
}
