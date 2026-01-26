import type { PaymentGateway, PaymentGatewayType } from "../payment-types";
import { RazorpayGateway } from "./razorpay-gateway";
import { StripeGateway } from "./stripe-gateway";

interface GatewayConfig {
    razorpay?: {
        keyId: string;
        keySecret: string;
    };
    stripe?: {
        secretKey: string;
        successUrl: string;
        cancelUrl: string;
    };
    paypal?: {
        clientId: string;
        clientSecret: string;
    };
}

export class PaymentGatewayFactory {
    private config: GatewayConfig;

    constructor(config: GatewayConfig) {
        this.config = config;
    }

    create(type: PaymentGatewayType): PaymentGateway {
        switch (type) {
            case "razorpay":
                if (!this.config.razorpay) {
                    throw new Error("Razorpay configuration not provided");
                }
                return new RazorpayGateway(
                    this.config.razorpay.keyId,
                    this.config.razorpay.keySecret
                );

            case "stripe":
                if (!this.config.stripe) {
                    throw new Error("Stripe configuration not provided");
                }
                return new StripeGateway(
                    this.config.stripe.secretKey,
                    this.config.stripe.successUrl,
                    this.config.stripe.cancelUrl
                );

            case "paypal":
                // Placeholder for PayPal implementation
                throw new Error("PayPal gateway not yet implemented");

            default: {
                throw new Error("Unknown payment gateway type");
            }
        }
    }
}
