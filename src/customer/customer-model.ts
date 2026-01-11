import mongoose from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import type { Address, Customer } from "./customer-types";

const addressSchema = new mongoose.Schema<Address>({
    text: { type: String, required: true },
    isDefault: { type: Boolean, required: true, default: false },
});

const customerSchema = new mongoose.Schema<Customer>(
    {
        userId: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        address: { type: [addressSchema], required: true },
    },
    {
        timestamps: true,
    }
);

// Unique indexes for userId and email
customerSchema.index({ userId: 1 }, { unique: true });
customerSchema.index({ email: 1 }, { unique: true });

customerSchema.plugin(aggregatePaginate);

const CustomerModel = mongoose.model<Customer>("Customer", customerSchema);

export default CustomerModel;
