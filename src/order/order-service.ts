import type { Order, OrderStatus, PaymentStatus } from "./order-types";
import type { AggregatePaginateModel, ClientSession, Model } from "mongoose";
import mongoose from "mongoose";

export class OrderService {
    constructor(private orderModel: Model<Order>) {}

    async create(orderData: Order) {
        const order = new this.orderModel(orderData);
        return order.save();
    }

    async createWithSession(orderData: Order, session: ClientSession) {
        const order = new this.orderModel(orderData);
        return order.save({ session });
    }

    async updateStatus(orderId: string, status: OrderStatus) {
        if (!mongoose.isValidObjectId(orderId)) {
            return null;
        }
        const order = await this.orderModel.findByIdAndUpdate(
            orderId,
            { status },
            { new: true, runValidators: true }
        );
        return order;
    }

    async updatePaymentStatus(
        orderId: string,
        paymentStatus: PaymentStatus,
        paymentId?: string
    ) {
        if (!mongoose.isValidObjectId(orderId)) {
            return null;
        }
        const updateData: Partial<Order> = { paymentStatus };
        if (paymentId) {
            updateData.paymentId = paymentId;
        }
        const order = await this.orderModel.findByIdAndUpdate(
            orderId,
            updateData,
            { new: true, runValidators: true }
        );
        return order;
    }

    async getAll(filters?: {
        q?: string;
        customerId?: string;
        tenantId?: string;
        status?: OrderStatus;
        limit?: number;
        page?: number;
    }) {
        const matchStage: Record<string, unknown> = {};

        if (filters?.q) {
            matchStage.$or = [
                { address: { $regex: filters.q, $options: "i" } },
                { couponCode: { $regex: filters.q, $options: "i" } },
            ];
        }

        if (filters?.customerId) {
            matchStage.customerId = filters.customerId;
        }

        if (filters?.tenantId) {
            matchStage.tenantId = filters.tenantId;
        }

        if (filters?.status) {
            matchStage.status = filters.status;
        }

        const aggregate = this.orderModel.aggregate([
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
        ]);

        const options = {
            page: filters?.page || 1,
            limit: filters?.limit || 10,
        };

        const result = await (
            this.orderModel as unknown as AggregatePaginateModel<Order>
        ).aggregatePaginate(aggregate, options);

        return {
            data: result.docs,
            total: result.totalDocs,
            page: result.page || 1,
            limit: result.limit,
            totalPages: result.totalPages,
        };
    }

    async getById(orderId: string) {
        if (!mongoose.isValidObjectId(orderId)) {
            return null;
        }
        const order = await this.orderModel.findById(orderId);
        return order;
    }

    async getByCustomerId(customerId: string) {
        const orders = await this.orderModel
            .find({ customerId })
            .sort({ createdAt: -1 });
        return orders;
    }

    async delete(orderId: string) {
        if (!mongoose.isValidObjectId(orderId)) {
            return null;
        }
        const order = await this.orderModel.findByIdAndDelete(orderId);
        return order;
    }
}
