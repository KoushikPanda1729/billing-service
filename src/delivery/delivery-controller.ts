import { type Request, type Response, type NextFunction } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import type { DeliveryConfiguration } from "./delivery-types";
import type { DeliveryService } from "./delivery-service";
import type { Logger } from "winston";
import { Roles } from "../common/constants/roles";

export class DeliveryController {
    constructor(
        private deliveryService: DeliveryService,
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

        const { isActive, orderValueTiers, freeDeliveryThreshold, tenantId } =
            req.body as {
                isActive?: boolean;
                orderValueTiers: DeliveryConfiguration["orderValueTiers"];
                freeDeliveryThreshold?: number;
                tenantId?: string;
            };

        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

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
        } else {
            return next(
                createHttpError(
                    403,
                    "Only admin and manager can create delivery configuration"
                )
            );
        }

        // Check if config already exists
        const existing =
            await this.deliveryService.getByTenantId(finalTenantId);
        if (existing) {
            return next(
                createHttpError(
                    409,
                    "Delivery configuration already exists for this tenant. Use PUT to update."
                )
            );
        }

        const config = await this.deliveryService.create(finalTenantId, {
            isActive: isActive ?? true,
            orderValueTiers,
            ...(freeDeliveryThreshold !== undefined && {
                freeDeliveryThreshold,
            }),
        });

        this.logger.info(
            "Delivery configuration created for tenant: " + finalTenantId
        );
        res.status(201).json({
            message: "Delivery configuration created",
            config,
        });
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

        const { isActive, orderValueTiers, freeDeliveryThreshold, tenantId } =
            req.body as {
                isActive?: boolean;
                orderValueTiers: DeliveryConfiguration["orderValueTiers"];
                freeDeliveryThreshold?: number;
                tenantId?: string;
            };

        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

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
        } else {
            return next(
                createHttpError(
                    403,
                    "Only admin and manager can update delivery configuration"
                )
            );
        }

        const config = await this.deliveryService.upsert(finalTenantId, {
            isActive: isActive ?? true,
            orderValueTiers,
            ...(freeDeliveryThreshold !== undefined && {
                freeDeliveryThreshold,
            }),
        });

        this.logger.info(
            "Delivery configuration updated for tenant: " + finalTenantId
        );
        res.status(200).json({
            message: "Delivery configuration updated",
            config,
        });
    }

    async getByTenant(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const { tenantId } = req.query;

        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

        let finalTenantId: string;

        if (userRole === Roles.ADMIN) {
            if (!tenantId) {
                return next(
                    createHttpError(
                        400,
                        "Admin must provide tenantId query parameter"
                    )
                );
            }
            finalTenantId = tenantId as string;
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
                    createHttpError(400, "tenantId query parameter is required")
                );
            }
            finalTenantId = tenantId as string;
        } else {
            return next(createHttpError(403, "Invalid role"));
        }

        const config = await this.deliveryService.getByTenantId(finalTenantId);

        if (!config) {
            return next(
                createHttpError(
                    404,
                    "Delivery configuration not found for this tenant"
                )
            );
        }

        this.logger.info(
            "Fetched delivery configuration for tenant: " + finalTenantId
        );
        res.status(200).json({
            message: "Delivery configuration fetched",
            config,
        });
    }

    async toggleActive(
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

        const { isActive, tenantId } = req.body as {
            isActive: boolean;
            tenantId?: string;
        };

        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

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
        } else {
            return next(
                createHttpError(
                    403,
                    "Only admin and manager can toggle delivery configuration"
                )
            );
        }

        const config = await this.deliveryService.toggleActive(
            finalTenantId,
            isActive
        );

        if (!config) {
            return next(
                createHttpError(404, "Delivery configuration not found")
            );
        }

        this.logger.info(
            `Delivery ${isActive ? "enabled" : "disabled"} for tenant: ${finalTenantId}`
        );
        res.status(200).json({
            message: `Delivery charges ${isActive ? "enabled" : "disabled"}`,
            config,
        });
    }

    async calculateCharge(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const { tenantId, orderSubTotal } = req.query;

        if (!tenantId || !orderSubTotal) {
            return next(
                createHttpError(
                    400,
                    "tenantId and orderSubTotal query parameters are required"
                )
            );
        }

        const result = await this.deliveryService.getDeliveryChargeForOrder(
            tenantId as string,
            parseFloat(orderSubTotal as string)
        );

        res.status(200).json({
            message: "Delivery charge calculated",
            ...result,
        });
    }

    async delete(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const { tenantId } = req.body as { tenantId?: string };

        const userRole = req.user?.role;
        const userTenant = req.user?.tenant;

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
        } else {
            return next(
                createHttpError(
                    403,
                    "Only admin and manager can delete delivery configuration"
                )
            );
        }

        const config = await this.deliveryService.delete(finalTenantId);

        if (!config) {
            return next(
                createHttpError(404, "Delivery configuration not found")
            );
        }

        this.logger.info(
            "Delivery configuration deleted for tenant: " + finalTenantId
        );
        res.status(200).json({
            message: "Delivery configuration deleted",
            config,
        });
    }
}
