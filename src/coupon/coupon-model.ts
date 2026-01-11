import mongoose from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import type { Coupon } from "./coupon-types";

const couponSchema = new mongoose.Schema<Coupon>(
    {
        title: { type: String, required: true },
        code: { type: String, required: true },
        discount: { type: Number, required: true, min: 0, max: 100 },
        validUpto: { type: Date, required: true },
        tenantId: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

// Unique index for code (case-insensitive) and tenantId combination
couponSchema.index({ code: 1, tenantId: 1 }, { unique: true });

// Pre-save hook to convert code to lowercase for case-insensitive storage
couponSchema.pre("save", function () {
    if (this.code) {
        this.code = this.code.toLowerCase();
    }
});

// Pre-update hook to convert code to lowercase
couponSchema.pre("findOneAndUpdate", function () {
    const update = this.getUpdate();
    if (
        update &&
        "$set" in update &&
        update.$set &&
        typeof update.$set === "object"
    ) {
        const setClause = update.$set as Record<string, unknown>;
        if ("code" in setClause && typeof setClause.code === "string") {
            setClause.code = setClause.code.toLowerCase();
        }
    } else if (update && "code" in update && typeof update.code === "string") {
        update.code = update.code.toLowerCase();
    }
});

couponSchema.plugin(aggregatePaginate);

const CouponModel = mongoose.model<Coupon>("Coupon", couponSchema);

export default CouponModel;
