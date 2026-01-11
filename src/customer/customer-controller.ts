import { type Request, type Response, type NextFunction } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import type { Customer } from "./customer-types";
import type { CustomerService } from "./customer-service";
import type { Logger } from "winston";

export class CustomerController {
    constructor(
        private customerService: CustomerService,
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

        const { address } = req.body as { address?: Customer["address"] };

        // Get user data from JWT token
        const userId = String(req.user?.sub);
        const firstName = req.user?.firstName || "";
        const lastName = req.user?.lastName || "";
        const email = req.user?.email || "";

        if (!userId || !firstName || !lastName || !email) {
            return next(
                createHttpError(400, "User information not found in token")
            );
        }

        try {
            const customer = await this.customerService.create({
                userId,
                firstName,
                lastName,
                email,
                address: address || [], // Default to empty array if not provided
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            this.logger.info(
                "Customer created successfully " + customer._id.toString()
            );
            res.status(201).json({ message: "Customer created", customer });
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
                        "Customer with this userId or email already exists"
                    )
                );
            }
            throw error;
        }
    }

    /**
     * Update customer profile (firstName, lastName, email, userId only)
     *
     * IMPORTANT: This endpoint does NOT update addresses.
     * Use dedicated address endpoints for address management:
     * - POST /customers/:id/addresses (add)
     * - PUT /customers/:id/addresses/:addressId (update)
     * - DELETE /customers/:id/addresses/:addressId (delete)
     */
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
            return next(createHttpError(400, "Customer ID is required"));
        }

        const updateData = req.body as Partial<
            Pick<Customer, "userId" | "firstName" | "lastName" | "email">
        >;

        // Get existing customer to check for changes
        const existingCustomer = await this.customerService.getById(id);
        if (!existingCustomer) {
            return next(createHttpError(404, "Customer not found"));
        }

        // Check if any field is actually changing
        const hasChanges =
            (updateData.userId &&
                updateData.userId !== existingCustomer.userId) ||
            (updateData.firstName &&
                updateData.firstName !== existingCustomer.firstName) ||
            (updateData.lastName &&
                updateData.lastName !== existingCustomer.lastName) ||
            (updateData.email && updateData.email !== existingCustomer.email);

        if (!hasChanges) {
            res.status(200).json({
                message:
                    "No changes detected. Customer data is already up to date.",
                customer: existingCustomer,
            });
            return;
        }

        // Explicitly prevent address updates through this endpoint
        // Addresses should ONLY be managed through dedicated address APIs
        const safeUpdateData: Partial<Customer> = {
            ...(updateData.userId && { userId: updateData.userId }),
            ...(updateData.firstName && { firstName: updateData.firstName }),
            ...(updateData.lastName && { lastName: updateData.lastName }),
            ...(updateData.email && { email: updateData.email }),
        };

        const customer = await this.customerService.update(id, safeUpdateData);

        if (!customer) {
            return next(createHttpError(404, "Customer not found"));
        }

        this.logger.info(
            "Customer updated successfully " + customer._id.toString()
        );
        res.status(200).json({
            message: "Customer updated successfully",
            customer,
        });
    }

    async getAll(
        req: Request,
        res: Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _next: NextFunction
    ): Promise<void> {
        const { q, limit, page } = req.query;

        const filters: {
            q?: string;
            limit?: number;
            page?: number;
        } = {};

        if (q) filters.q = q as string;
        if (limit) filters.limit = parseInt(limit as string);
        if (page) filters.page = parseInt(page as string);

        const result = await this.customerService.getAll(filters);
        this.logger.info("Fetched all customers");
        res.status(200).json({
            message: "Customers fetched successfully",
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
            return next(createHttpError(400, "Customer ID is required"));
        }

        const customer = await this.customerService.getById(id);

        if (!customer) {
            return next(createHttpError(404, "Customer not found"));
        }

        this.logger.info("Fetched customer by ID: " + id);
        res.status(200).json({
            message: "Customer fetched successfully",
            customer,
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
            return next(createHttpError(400, "Customer ID is required"));
        }

        const customer = await this.customerService.delete(id);

        if (!customer) {
            return next(createHttpError(404, "Customer not found"));
        }

        this.logger.info("Customer deleted successfully: " + id);
        res.status(200).json({
            message: "Customer deleted successfully",
            customer,
        });
    }

    async addAddress(
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
        const { text, isDefault } = req.body as {
            text: string;
            isDefault: boolean;
        };

        if (!id) {
            return next(createHttpError(400, "Customer ID is required"));
        }

        try {
            const customer = await this.customerService.addAddress(id, {
                text,
                isDefault,
            });

            if (!customer) {
                return next(createHttpError(404, "Customer not found"));
            }

            this.logger.info("Address added successfully to customer: " + id);
            res.status(200).json({
                message: "Address added successfully",
                customer,
            });
        } catch (error) {
            if (
                error instanceof Error &&
                error.message === "Address already exists"
            ) {
                return next(
                    createHttpError(
                        409,
                        "This address already exists for this customer"
                    )
                );
            }
            throw error;
        }
    }

    async updateAddress(
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

        const { id, addressId } = req.params;
        const addressData = req.body as {
            text?: string;
            isDefault?: boolean;
        };

        if (!id || !addressId) {
            return next(
                createHttpError(400, "Customer ID and Address ID are required")
            );
        }

        const updateData: { text?: string; isDefault?: boolean } = {};
        if (addressData.text !== undefined) {
            updateData.text = addressData.text;
        }
        if (addressData.isDefault !== undefined) {
            updateData.isDefault = addressData.isDefault;
        }

        try {
            const customer = await this.customerService.updateAddress(
                id,
                addressId,
                updateData
            );

            if (!customer) {
                return next(
                    createHttpError(404, "Customer or address not found")
                );
            }

            this.logger.info(
                `Address ${addressId} updated successfully for customer: ${id}`
            );
            res.status(200).json({
                message: "Address updated successfully",
                customer,
            });
        } catch (error) {
            if (
                error instanceof Error &&
                error.message === "Address already exists"
            ) {
                return next(
                    createHttpError(
                        409,
                        "This address already exists for this customer"
                    )
                );
            }
            throw error;
        }
    }

    async deleteAddress(
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

        const { id, addressId } = req.params;

        if (!id || !addressId) {
            return next(
                createHttpError(400, "Customer ID and Address ID are required")
            );
        }

        const customer = await this.customerService.deleteAddress(
            id,
            addressId
        );

        if (!customer) {
            return next(createHttpError(404, "Customer or address not found"));
        }

        this.logger.info(
            `Address ${addressId} deleted successfully for customer: ${id}`
        );
        res.status(200).json({
            message: "Address deleted successfully",
            customer,
        });
    }
}
