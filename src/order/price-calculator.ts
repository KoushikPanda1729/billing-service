import ProductModel from "../product/product-model";
import ToppingModel from "../topping/topping-model";
import TaxConfigurationModel from "../tax/tax-model";
import type { OrderItem, TaxBreakdownItem } from "./order-types";
import type { Coupon } from "../coupon/coupon-types";

export interface PriceValidationResult {
    isValid: boolean;
    subTotal: number;
    discountAmount: number;
    taxableAmount: number;
    taxes: TaxBreakdownItem[];
    taxTotal: number;
    finalTotal: number;
    errors: string[];
    itemDetails: {
        productId: string;
        calculatedPrice: number;
        submittedPrice: number;
        isValid: boolean;
    }[];
}

export class PriceCalculator {
    async calculateItemPrice(
        item: OrderItem,
        tenantId: string
    ): Promise<{ price: number; error?: string }> {
        // Fetch product from local DB (synced via Kafka)
        const product = await ProductModel.findById(item._id).lean();

        if (!product) {
            return { price: 0, error: `Product not found: ${item._id}` };
        }

        if (product.tenantId !== tenantId) {
            return {
                price: 0,
                error: `Product ${item._id} does not belong to tenant`,
            };
        }

        if (!product.isPublished) {
            return {
                price: 0,
                error: `Product ${item._id} is not available`,
            };
        }

        let itemPrice = 0;

        // Get priceConfiguration - handle both Map and plain object
        const priceConfig = product.priceConfiguration as
            | Map<
                  string,
                  {
                      priceType: string;
                      availableOptions:
                          | Map<string, number>
                          | Record<string, number>;
                  }
              >
            | Record<
                  string,
                  {
                      priceType: string;
                      availableOptions: Record<string, number>;
                  }
              >;

        // Calculate price from priceConfiguration
        for (const [configKey, selectedOption] of Object.entries(
            item.priceConfiguration
        )) {
            // Handle both Map and plain object
            const config =
                priceConfig instanceof Map
                    ? priceConfig.get(configKey)
                    : priceConfig[configKey];

            if (!config) {
                return {
                    price: 0,
                    error: `Invalid configuration key "${configKey}" for product ${item._id}`,
                };
            }

            // Handle availableOptions as Map or plain object
            const availableOptions = config.availableOptions;
            const optionPrice =
                availableOptions instanceof Map
                    ? availableOptions.get(selectedOption)
                    : availableOptions[selectedOption];

            if (optionPrice === undefined) {
                return {
                    price: 0,
                    error: `Invalid option "${selectedOption}" for configuration "${configKey}" in product ${item._id}`,
                };
            }

            itemPrice += optionPrice;
        }

        // Calculate toppings price
        for (const topping of item.toppings || []) {
            const dbTopping = await ToppingModel.findById(topping._id);

            if (!dbTopping) {
                return {
                    price: 0,
                    error: `Topping not found: ${topping._id}`,
                };
            }

            if (dbTopping.tenantId !== tenantId) {
                return {
                    price: 0,
                    error: `Topping ${topping._id} does not belong to tenant`,
                };
            }

            if (!dbTopping.isPublished) {
                return {
                    price: 0,
                    error: `Topping ${topping._id} is not available`,
                };
            }

            // Validate topping price matches
            if (dbTopping.price !== topping.price) {
                return {
                    price: 0,
                    error: `Topping price mismatch for ${topping._id}: expected ${dbTopping.price}, got ${topping.price}`,
                };
            }

            itemPrice += dbTopping.price;
        }

        // Multiply by quantity
        itemPrice *= item.qty;

        return { price: itemPrice };
    }

    async validateOrderPricing(
        items: OrderItem[],
        tenantId: string,
        submittedTotal: number,
        coupon?: Coupon | null,
        submittedDiscount?: number,
        submittedTaxTotal?: number
    ): Promise<PriceValidationResult> {
        const errors: string[] = [];
        const itemDetails: PriceValidationResult["itemDetails"] = [];
        let subTotal = 0;

        // Calculate each item's price
        for (const item of items) {
            const result = await this.calculateItemPrice(item, tenantId);

            if (result.error) {
                errors.push(result.error);
                itemDetails.push({
                    productId: item._id,
                    calculatedPrice: 0,
                    submittedPrice: item.totalPrice,
                    isValid: false,
                });
                continue;
            }

            const isItemValid = Math.abs(result.price - item.totalPrice) < 0.01; // Allow small floating point difference

            if (!isItemValid) {
                errors.push(
                    `Price mismatch for item ${item._id}: calculated ${result.price}, submitted ${item.totalPrice}`
                );
            }

            itemDetails.push({
                productId: item._id,
                calculatedPrice: result.price,
                submittedPrice: item.totalPrice,
                isValid: isItemValid,
            });

            subTotal += result.price;
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon) {
            // Validate coupon is not expired
            if (new Date(coupon.validUpto) <= new Date()) {
                errors.push("Coupon has expired");
            } else {
                discountAmount = (subTotal * coupon.discount) / 100;
                // Round to 2 decimal places
                discountAmount = Math.round(discountAmount * 100) / 100;
            }
        }

        // Validate submitted discount matches calculated discount
        if (submittedDiscount !== undefined) {
            if (Math.abs(discountAmount - submittedDiscount) > 0.01) {
                errors.push(
                    `Discount mismatch: calculated ${discountAmount}, submitted ${submittedDiscount}`
                );
            }
        }

        // Calculate taxable amount (after discount)
        const taxableAmount = subTotal - discountAmount;

        // Calculate taxes
        const taxes: TaxBreakdownItem[] = [];
        let taxTotal = 0;

        // Fetch tax configuration for tenant
        const taxConfig = await TaxConfigurationModel.findOne({ tenantId });

        if (taxConfig && taxConfig.taxes.length > 0) {
            for (const tax of taxConfig.taxes) {
                // Only apply active taxes
                if (tax.isActive) {
                    const taxAmount =
                        Math.round(taxableAmount * (tax.rate / 100) * 100) /
                        100;
                    taxes.push({
                        name: tax.name,
                        rate: tax.rate,
                        amount: taxAmount,
                    });
                    taxTotal += taxAmount;
                }
            }
        }

        // Round tax total
        taxTotal = Math.round(taxTotal * 100) / 100;

        // Validate submitted tax total matches calculated tax total
        if (submittedTaxTotal !== undefined) {
            if (Math.abs(taxTotal - submittedTaxTotal) > 0.01) {
                errors.push(
                    `Tax mismatch: calculated ${taxTotal}, submitted ${submittedTaxTotal}`
                );
            }
        }

        const finalTotal = Math.round((taxableAmount + taxTotal) * 100) / 100;

        // Validate final total
        if (Math.abs(finalTotal - submittedTotal) > 0.01) {
            errors.push(
                `Total mismatch: calculated ${finalTotal}, submitted ${submittedTotal}`
            );
        }

        return {
            isValid: errors.length === 0,
            subTotal,
            discountAmount,
            taxableAmount,
            taxes,
            taxTotal,
            finalTotal,
            errors,
            itemDetails,
        };
    }
}
