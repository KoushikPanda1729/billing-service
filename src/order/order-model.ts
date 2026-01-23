import mongoose from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import type { Order } from "./order-types";

const orderToppingSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
    },
    { _id: false }
);

const orderItemSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        image: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
        priceConfiguration: {
            type: Map,
            of: String,
            required: true,
        },
        toppings: { type: [orderToppingSchema], default: [] },
        totalPrice: { type: Number, required: true },
    },
    { _id: false }
);

const taxBreakdownSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema<Order>(
    {
        customerId: { type: String, required: true },
        address: { type: String, required: true },
        items: { type: [orderItemSchema], required: true },
        subTotal: { type: Number, required: true },
        couponCode: { type: String },
        discount: { type: Number, required: true, default: 0 },
        deliveryCharge: { type: Number, required: true, default: 0 },
        taxes: { type: [taxBreakdownSchema], default: [] },
        taxTotal: { type: Number, required: true, default: 0 },
        total: { type: Number, required: true },
        paymentMode: {
            type: String,
            enum: ["card", "cash", "upi", "netbanking", "wallet"],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        paymentId: { type: String },
        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "preparing",
                "out_for_delivery",
                "delivered",
                "cancelled",
            ],
            default: "pending",
        },
        tenantId: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ customerId: 1 });
orderSchema.index({ tenantId: 1 });
orderSchema.index({ status: 1 });

orderSchema.plugin(aggregatePaginate);

const OrderModel = mongoose.model<Order>("Order", orderSchema);

export default OrderModel;
