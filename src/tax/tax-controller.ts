import { type Request, type Response, type NextFunction } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import type { TaxComponent } from "./tax-types";
import type { TaxService } from "./tax-service";
import type { Logger } from "winston";
import { Roles } from "../common/constants/roles";

export class TaxController {
    constructor(
        private taxService: TaxService,
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

        const { taxes, tenantId } = req.body as {
            taxes: TaxComponent[];
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
                    "Only admin and manager can create tax configuration"
                )
            );
        }

        // Check if tax config already exists for this tenant
        const existing = await this.taxService.getByTenantId(finalTenantId);
        if (existing) {
            return next(
                createHttpError(
                    409,
                    "Tax configuration already exists for this tenant. Use PUT to update."
                )
            );
        }

        const taxConfig = await this.taxService.create(finalTenantId, taxes);

        this.logger.info(
            "Tax configuration created for tenant: " + finalTenantId
        );
        res.status(201).json({
            message: "Tax configuration created",
            taxConfig,
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

        const { taxes, tenantId } = req.body as {
            taxes: TaxComponent[];
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
                    "Only admin and manager can update tax configuration"
                )
            );
        }

        const taxConfig = await this.taxService.upsert(finalTenantId, taxes);

        this.logger.info(
            "Tax configuration updated for tenant: " + finalTenantId
        );
        res.status(200).json({
            message: "Tax configuration updated",
            taxConfig,
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

        const taxConfig = await this.taxService.getByTenantId(finalTenantId);

        if (!taxConfig) {
            return next(
                createHttpError(
                    404,
                    "Tax configuration not found for this tenant"
                )
            );
        }

        this.logger.info(
            "Fetched tax configuration for tenant: " + finalTenantId
        );
        res.status(200).json({
            message: "Tax configuration fetched",
            taxConfig,
        });
    }

    async toggleTax(
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

        const { taxName, isActive, tenantId } = req.body as {
            taxName: string;
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
                createHttpError(403, "Only admin and manager can toggle taxes")
            );
        }

        const taxConfig = await this.taxService.toggleTax(
            finalTenantId,
            taxName,
            isActive
        );

        if (!taxConfig) {
            return next(
                createHttpError(404, "Tax configuration or tax not found")
            );
        }

        this.logger.info(
            `Tax "${taxName}" ${isActive ? "activated" : "deactivated"} for tenant: ${finalTenantId}`
        );
        res.status(200).json({
            message: `Tax "${taxName}" ${isActive ? "activated" : "deactivated"}`,
            taxConfig,
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
                    "Only admin and manager can delete tax configuration"
                )
            );
        }

        const taxConfig = await this.taxService.delete(finalTenantId);

        if (!taxConfig) {
            return next(createHttpError(404, "Tax configuration not found"));
        }

        this.logger.info(
            "Tax configuration deleted for tenant: " + finalTenantId
        );
        res.status(200).json({
            message: "Tax configuration deleted",
            taxConfig,
        });
    }
}
