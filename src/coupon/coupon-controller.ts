import { type Request, type Response, type NextFunction } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import type { Coupon } from "./coupon-types";
import type { CouponService } from "./coupon-service";
import type { Logger } from "winston";
import { Roles } from "../common/constants/roles";

export class CouponController {
    constructor(
        private couponService: CouponService,
        private logger: Logger
    ) {}

    async create(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        const { title, code, discount, validUpto, tenantId } = req.body as {
            title: string;
            code: string;
            discount: number;
            validUpto: Date;
            tenantId?: string;
        };

        // Get user role and tenant from JWT token
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        // Determine the tenantId based on role
        let finalTenantId: string;

        if (userRole === Roles.ADMIN) {
            // Admin must provide tenantId in request body
            if (!tenantId) {
                return next(
                    createHttpError(
                        400,
                        "Admin must provide tenantId in request body"
                    )
                );
            }
            finalTenantId = tenantId;
        } else if (userRole === Roles.MANAGER) {
            // Manager uses their tenant from token
            if (!userTenant) {
                return next(
                    createHttpError(400, "Manager tenant information not found")
                );
            }
            finalTenantId = String(userTenant);
        } else {
            return next(
                createHttpError(
                    403,
                    "Only admin and manager can create coupons"
                )
            );
        }

        try {
            // Check if coupon code already exists for this tenant
            const existingCoupon = await this.couponService.getByCode(
                code,
                finalTenantId
            );
            if (existingCoupon) {
                return next(
                    createHttpError(
                        409,
                        "Coupon code already exists for this tenant"
                    )
                );
            }

            const coupon = await this.couponService.create({
                title,
                code,
                discount,
                validUpto: new Date(validUpto),
                tenantId: finalTenantId,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            this.logger.info(
                "Coupon created successfully " + coupon._id?.toString()
            );
            res.status(201).json({ message: "Coupon created", coupon });
        } catch (error) {
            // Handle MongoDB duplicate key error
            if (
                error instanceof Error &&
                "code" in error &&
                error.code === 11000
            ) {
                return next(
                    createHttpError(
                        409,
                        "Coupon code already exists for this tenant"
                    )
                );
            }
            throw error;
        }
    }

    async update(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        const { id } = req.params;

        if (!id) {
            return next(createHttpError(400, "Coupon ID is required"));
        }

        const updateData = req.body as Partial<
            Pick<Coupon, "title" | "code" | "discount" | "validUpto">
        >;

        // Get existing coupon to check ownership
        const existingCoupon = await this.couponService.getById(id);
        if (!existingCoupon) {
            return next(createHttpError(404, "Coupon not found"));
        }

        // Check if user has permission to update this coupon
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        if (userRole === Roles.MANAGER) {
            // Manager can only update coupons for their tenant
            if (existingCoupon.tenantId !== String(userTenant)) {
                return next(
                    createHttpError(
                        403,
                        "You can only update coupons for your tenant"
                    )
                );
            }
        }

        // If updating code, check for duplicates
        if (updateData.code) {
            const duplicateCoupon = await this.couponService.getByCode(
                updateData.code,
                existingCoupon.tenantId
            );
            if (
                duplicateCoupon &&
                String(duplicateCoupon._id) !== String(existingCoupon._id)
            ) {
                return next(
                    createHttpError(
                        409,
                        "Coupon code already exists for this tenant"
                    )
                );
            }
        }

        const safeUpdateData: Partial<Coupon> = {
            ...(updateData.title && { title: updateData.title }),
            ...(updateData.code && { code: updateData.code }),
            ...(updateData.discount !== undefined && {
                discount: updateData.discount,
            }),
            ...(updateData.validUpto && {
                validUpto: new Date(updateData.validUpto),
            }),
        };

        const coupon = await this.couponService.update(id, safeUpdateData);

        if (!coupon) {
            return next(createHttpError(404, "Coupon not found"));
        }

        this.logger.info(
            "Coupon updated successfully " + coupon._id?.toString()
        );
        res.status(200).json({
            message: "Coupon updated successfully",
            coupon,
        });
    }

    async getAll(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const { q, limit, page, tenantId } = req.query;

        const filters: {
            q?: string;
            tenantId?: string;
            limit?: number;
            page?: number;
        } = {};

        if (q) filters.q = q as string;
        if (limit) filters.limit = parseInt(limit as string);
        if (page) filters.page = parseInt(page as string);

        // Get user role and tenant
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        // Apply tenant filtering based on role
        if (userRole === Roles.MANAGER && userTenant) {
            // Manager: Always filter by their tenant (ignore query param)
            filters.tenantId = String(userTenant);
        } else if (userRole === Roles.CUSTOMER) {
            // Customer: Must provide tenantId query parameter
            if (!tenantId) {
                return next(
                    createHttpError(400, "tenantId query parameter is required")
                );
            }
            filters.tenantId = tenantId as string;
        } else if (userRole === Roles.ADMIN && tenantId) {
            // Admin: Optionally filter by tenantId query parameter
            filters.tenantId = tenantId as string;
        }

        const result = await this.couponService.getAll(filters);

        // For customers, filter out expired coupons
        if (userRole === Roles.CUSTOMER) {
            const now = new Date();
            const validCoupons = result.data.filter(
                (coupon: Coupon) => new Date(coupon.validUpto) > now
            );

            this.logger.info(
                `Fetched ${validCoupons.length} valid coupons for customer`
            );
            res.status(200).json({
                message: "Coupons fetched successfully",
                data: validCoupons,
                total: validCoupons.length,
                page: result.page,
                limit: result.limit,
            });
        } else {
            this.logger.info("Fetched all coupons");
            res.status(200).json({
                message: "Coupons fetched successfully",
                ...result,
            });
        }
    }

    async getById(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        const { id } = req.params;

        if (!id) {
            return next(createHttpError(400, "Coupon ID is required"));
        }

        const coupon = await this.couponService.getById(id);

        if (!coupon) {
            return next(createHttpError(404, "Coupon not found"));
        }

        // Check if user has permission to view this coupon
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        if (userRole === Roles.MANAGER) {
            // Manager can only view coupons for their tenant
            if (coupon.tenantId !== String(userTenant)) {
                return next(
                    createHttpError(
                        403,
                        "You can only view coupons for your tenant"
                    )
                );
            }
        }

        this.logger.info("Fetched coupon by ID: " + id);
        res.status(200).json({
            message: "Coupon fetched successfully",
            coupon,
        });
    }

    async delete(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        const { id } = req.params;

        if (!id) {
            return next(createHttpError(400, "Coupon ID is required"));
        }

        // Get existing coupon to check ownership
        const existingCoupon = await this.couponService.getById(id);
        if (!existingCoupon) {
            return next(createHttpError(404, "Coupon not found"));
        }

        // Check if user has permission to delete this coupon
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        if (userRole === Roles.MANAGER) {
            // Manager can only delete coupons for their tenant
            if (existingCoupon.tenantId !== String(userTenant)) {
                return next(
                    createHttpError(
                        403,
                        "You can only delete coupons for your tenant"
                    )
                );
            }
        }

        const coupon = await this.couponService.delete(id);

        if (!coupon) {
            return next(createHttpError(404, "Coupon not found"));
        }

        this.logger.info("Coupon deleted successfully: " + id);
        res.status(200).json({
            message: "Coupon deleted successfully",
            coupon,
        });
    }

    async verify(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(
                createHttpError(400, "Validation Error", {
                    errors: result.array(),
                })
            );
        }

        const { code, tenantId } = req.body as {
            code: string;
            tenantId: string;
        };

        const coupon = await this.couponService.getByCode(code, tenantId);

        if (!coupon) {
            return next(createHttpError(404, "Coupon not found"));
        }

        // Check if coupon has expired
        const now = new Date();
        const validUpto = new Date(coupon.validUpto);

        if (validUpto <= now) {
            return next(createHttpError(400, "Coupon has expired"));
        }

        this.logger.info(
            `Coupon verified successfully: ${code} for tenant: ${tenantId}`
        );
        res.status(200).json({
            message: "Coupon is valid",
            coupon: {
                code: coupon.code,
                title: coupon.title,
                discount: coupon.discount,
                validUpto: coupon.validUpto,
            },
        });
    }
}
