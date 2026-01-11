import type { Coupon } from "./coupon-types";
import type { AggregatePaginateModel, Model } from "mongoose";
import mongoose from "mongoose";

export class CouponService {
    constructor(private couponModel: Model<Coupon>) {}

    async create(couponData: Coupon) {
        const coupon = new this.couponModel(couponData);
        return coupon.save();
    }

    async update(couponId: string, couponData: Partial<Coupon>) {
        if (!mongoose.isValidObjectId(couponId)) {
            return null;
        }
        const coupon = await this.couponModel.findByIdAndUpdate(
            couponId,
            couponData,
            { new: true, runValidators: true }
        );
        return coupon;
    }

    async getAll(filters?: {
        q?: string;
        tenantId?: string;
        limit?: number;
        page?: number;
    }) {
        const matchStage: Record<string, unknown> = {};

        if (filters?.q) {
            matchStage.$or = [
                { title: { $regex: filters.q, $options: "i" } },
                { code: { $regex: filters.q, $options: "i" } },
            ];
        }

        if (filters?.tenantId) {
            matchStage.tenantId = filters.tenantId;
        }

        const aggregate = this.couponModel.aggregate([{ $match: matchStage }]);

        const options = {
            page: filters?.page || 1,
            limit: filters?.limit || 10,
        };

        const result = await (
            this.couponModel as unknown as AggregatePaginateModel<Coupon>
        ).aggregatePaginate(aggregate, options);

        return {
            data: result.docs,
            total: result.totalDocs,
            page: result.page || 1,
            limit: result.limit,
            totalPages: result.totalPages,
        };
    }

    async getById(couponId: string) {
        if (!mongoose.isValidObjectId(couponId)) {
            return null;
        }
        const coupon = await this.couponModel.findById(couponId);
        return coupon;
    }

    async getByCode(code: string, tenantId: string) {
        // Convert to lowercase for case-insensitive search
        const coupon = await this.couponModel.findOne({
            code: code.toLowerCase(),
            tenantId,
        });
        return coupon;
    }

    async delete(couponId: string) {
        if (!mongoose.isValidObjectId(couponId)) {
            return null;
        }
        const coupon = await this.couponModel.findByIdAndDelete(couponId);
        return coupon;
    }
}
