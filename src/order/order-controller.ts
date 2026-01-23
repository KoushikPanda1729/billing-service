import { type Request, type Response, type NextFunction } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import type { Order, OrderStatus } from "./order-types";
import type { OrderService } from "./order-service";
import type { CouponService } from "../coupon/coupon-service";
import { PriceCalculator } from "./price-calculator";
import type { Logger } from "winston";
import { Roles } from "../common/constants/roles";

export class OrderController {
    private priceCalculator: PriceCalculator;

    constructor(
        private orderService: OrderService,
        private couponService: CouponService,
        private logger: Logger
    ) {
        this.priceCalculator = new PriceCalculator();
    }

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

        const {
            address,
            items,
            couponCode,
            discount,
            deliveryCharge,
            taxTotal,
            total,
            paymentMode,
            tenantId,
        } = req.body as {
            address: string;
            items: Order["items"];
            couponCode?: string;
            discount?: number;
            deliveryCharge?: number;
            taxTotal?: number;
            total: number;
            paymentMode: Order["paymentMode"];
            tenantId?: string;
        };

        // Get user info from JWT token
        const userId = req.user?.sub;
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        if (!userId) {
            return next(createHttpError(401, "User not authenticated"));
        }

        // Determine the tenantId based on role
        let finalTenantId: string;

        if (userRole === Roles.ADMIN) {
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
            if (!userTenant) {
                return next(
                    createHttpError(400, "Manager tenant information not found")
                );
            }
            finalTenantId = String(userTenant);
        } else if (userRole === Roles.CUSTOMER) {
            if (!tenantId) {
                return next(
                    createHttpError(
                        400,
                        "Customer must provide tenantId in request body"
                    )
                );
            }
            finalTenantId = tenantId;
        } else {
            return next(
                createHttpError(403, "Invalid role for creating orders")
            );
        }

        // Validate coupon if provided
        let coupon = null;
        if (couponCode) {
            coupon = await this.couponService.getByCode(
                couponCode,
                finalTenantId
            );
            if (!coupon) {
                return next(
                    createHttpError(400, `Invalid coupon code: ${couponCode}`)
                );
            }
            if (new Date(coupon.validUpto) <= new Date()) {
                return next(createHttpError(400, "Coupon has expired"));
            }
        }

        // Validate pricing
        const priceValidation = await this.priceCalculator.validateOrderPricing(
            items,
            finalTenantId,
            total,
            coupon,
            discount,
            taxTotal,
            deliveryCharge
        );

        if (!priceValidation.isValid) {
            this.logger.warn("Price validation failed", {
                errors: priceValidation.errors,
                itemDetails: priceValidation.itemDetails,
            });
            return next(
                createHttpError(400, "Price validation failed", {
                    errors: priceValidation.errors,
                    calculatedTotal: priceValidation.finalTotal,
                    submittedTotal: total,
                })
            );
        }

        const orderData: Order = {
            customerId: String(userId),
            address,
            items,
            subTotal: priceValidation.subTotal,
            discount: priceValidation.discountAmount,
            deliveryCharge: priceValidation.deliveryCharge,
            taxes: priceValidation.taxes,
            taxTotal: priceValidation.taxTotal,
            total: priceValidation.finalTotal,
            paymentMode,
            paymentStatus: "pending",
            status: "pending",
            tenantId: finalTenantId,
        };

        if (couponCode) {
            orderData.couponCode = couponCode;
        }

        const order = await this.orderService.create(orderData);

        this.logger.info("Order created successfully " + order._id?.toString());
        res.status(201).json({ message: "Order created", order });
    }

    async updateStatus(
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
        const { status } = req.body as { status: OrderStatus };

        if (!id) {
            return next(createHttpError(400, "Order ID is required"));
        }

        // Get existing order to check ownership
        const existingOrder = await this.orderService.getById(id);
        if (!existingOrder) {
            return next(createHttpError(404, "Order not found"));
        }

        // Check if user has permission to update this order
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        if (userRole === Roles.MANAGER) {
            if (existingOrder.tenantId !== String(userTenant)) {
                return next(
                    createHttpError(
                        403,
                        "You can only update orders for your tenant"
                    )
                );
            }
        } else if (userRole === Roles.CUSTOMER) {
            // Customer can only cancel their own orders
            if (status !== "cancelled") {
                return next(
                    createHttpError(403, "Customers can only cancel orders")
                );
            }
            if (existingOrder.customerId !== String(req.user?.sub)) {
                return next(
                    createHttpError(403, "You can only cancel your own orders")
                );
            }
        }

        const order = await this.orderService.updateStatus(id, status);

        if (!order) {
            return next(createHttpError(404, "Order not found"));
        }

        this.logger.info(
            "Order status updated successfully " + order._id?.toString()
        );
        res.status(200).json({
            message: "Order status updated successfully",
            order,
        });
    }

    async getAll(
        req: Request,
        res: Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: NextFunction
    ): Promise<void> {
        const { q, limit, page, tenantId, status, customerId } = req.query;

        const filters: {
            q?: string;
            customerId?: string;
            tenantId?: string;
            status?: OrderStatus;
            limit?: number;
            page?: number;
        } = {};

        if (q) filters.q = q as string;
        if (limit) filters.limit = parseInt(limit as string);
        if (page) filters.page = parseInt(page as string);
        if (status) filters.status = status as OrderStatus;
        if (customerId) filters.customerId = customerId as string;

        // Get user role and tenant
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;
        const userId = req.user?.sub;

        // Apply filtering based on role
        if (userRole === Roles.MANAGER && userTenant) {
            filters.tenantId = String(userTenant);
        } else if (userRole === Roles.CUSTOMER) {
            // Customer can only see their own orders
            filters.customerId = String(userId);
            if (tenantId) {
                filters.tenantId = tenantId as string;
            }
        } else if (userRole === Roles.ADMIN && tenantId) {
            filters.tenantId = tenantId as string;
        }

        const result = await this.orderService.getAll(filters);

        this.logger.info("Fetched orders");
        res.status(200).json({
            message: "Orders fetched successfully",
            ...result,
        });
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
            return next(createHttpError(400, "Order ID is required"));
        }

        const order = await this.orderService.getById(id);

        if (!order) {
            return next(createHttpError(404, "Order not found"));
        }

        // Check if user has permission to view this order
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;
        const userId = req.user?.sub;

        if (userRole === Roles.MANAGER) {
            if (order.tenantId !== String(userTenant)) {
                return next(
                    createHttpError(
                        403,
                        "You can only view orders for your tenant"
                    )
                );
            }
        } else if (userRole === Roles.CUSTOMER) {
            if (order.customerId !== String(userId)) {
                return next(
                    createHttpError(403, "You can only view your own orders")
                );
            }
        }

        this.logger.info("Fetched order by ID: " + id);
        res.status(200).json({
            message: "Order fetched successfully",
            order,
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
            return next(createHttpError(400, "Order ID is required"));
        }

        // Get existing order to check ownership
        const existingOrder = await this.orderService.getById(id);
        if (!existingOrder) {
            return next(createHttpError(404, "Order not found"));
        }

        // Check if user has permission to delete this order
        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        if (userRole === Roles.MANAGER) {
            if (existingOrder.tenantId !== String(userTenant)) {
                return next(
                    createHttpError(
                        403,
                        "You can only delete orders for your tenant"
                    )
                );
            }
        } else if (userRole === Roles.CUSTOMER) {
            return next(createHttpError(403, "Customers cannot delete orders"));
        }

        const order = await this.orderService.delete(id);

        if (!order) {
            return next(createHttpError(404, "Order not found"));
        }

        this.logger.info("Order deleted successfully: " + id);
        res.status(200).json({
            message: "Order deleted successfully",
            order,
        });
    }

    async getMyOrders(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const userId = req.user?.sub;

        if (!userId) {
            return next(createHttpError(401, "User not authenticated"));
        }

        const orders = await this.orderService.getByCustomerId(String(userId));

        this.logger.info("Fetched orders for user: " + userId);
        res.status(200).json({
            message: "Orders fetched successfully",
            orders,
        });
    }
}
