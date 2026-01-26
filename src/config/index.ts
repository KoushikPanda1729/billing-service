import config from "config";
import type { PaymentGatewayType } from "../payment/payment-types";

export const Config = {
    PORT: config.get<number>("server.port"),
    HOST: config.get<string>("server.host"),
    DATABASE_URL: config.get<string>("database.url"),
    JWKS_URI: config.get<string>("auth.jwksUri"),
    BROKER_TYPE: config.get<string>("broker.type"),
    KAFKA_CLIENT_ID: config.get<string>("kafka.clientId"),
    KAFKA_BROKERS: config.get<string[]>("kafka.brokers"),
    // Payment gateway config
    PAYMENT_GATEWAY: config.get<PaymentGatewayType>("payment.gateway"),
    RAZORPAY_KEY_ID: config.get<string>("payment.razorpay.keyId"),
    RAZORPAY_KEY_SECRET: config.get<string>("payment.razorpay.keySecret"),
};
