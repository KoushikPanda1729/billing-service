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

        const { address } = req.body as Pick<Customer, "address">;

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
                address,
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

        const updateData = req.body as Partial<Customer>;

        const customer = await this.customerService.update(id, updateData);

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
}
