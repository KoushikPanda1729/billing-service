import CustomerModel from "./customer-model";
import type { Customer } from "./customer-types";
import type { AggregatePaginateModel } from "mongoose";
import mongoose from "mongoose";

export class CustomerService {
    async create(customerData: Customer) {
        const customer = new CustomerModel(customerData);
        return customer.save();
    }

    async update(customerId: string, customerData: Partial<Customer>) {
        if (!mongoose.isValidObjectId(customerId)) {
            return null;
        }
        const customer = await CustomerModel.findByIdAndUpdate(
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

        const aggregate = CustomerModel.aggregate([{ $match: matchStage }]);

        const options = {
            page: filters?.page || 1,
            limit: filters?.limit || 10,
        };

        const result = await (
            CustomerModel as unknown as AggregatePaginateModel<Customer>
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
        const customer = await CustomerModel.findById(customerId);
        return customer;
    }

    async delete(customerId: string) {
        if (!mongoose.isValidObjectId(customerId)) {
            return null;
        }
        const customer = await CustomerModel.findByIdAndDelete(customerId);
        return customer;
    }
}
