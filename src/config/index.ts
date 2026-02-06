import config from "config";
import type { PaymentGatewayType } from "../payment/payment-types";

const getCorsOrigin = (): string[] => {
    const origin = config.get<string | string[]>("cors.origin");
    if (typeof origin === "string") {
        return origin.split(",").map((s) => s.trim());
    }
    return origin;
};

const getKafkaBrokers = (): string[] => {
    const brokers = config.get<string | string[]>("kafka.brokers");
    if (typeof brokers === "string") {
        return brokers.split(",").map((s) => s.trim());
    }
    return brokers;
};

const getKafkaSsl = (): boolean => {
    if (!config.has("kafka.ssl")) return false;
    const ssl = config.get<string | boolean>("kafka.ssl");
    if (typeof ssl === "string") {
        return ssl === "true";
    }
    return ssl;
};

export const Config = {
    PORT: config.get<number>("server.port"),
    HOST: config.get<string>("server.host"),
    DATABASE_URL: config.get<string>("database.url"),
    JWKS_URI: config.get<string>("auth.jwksUri"),
    BROKER_TYPE: config.get<string>("broker.type"),
    KAFKA_CLIENT_ID: config.get<string>("kafka.clientId"),
    KAFKA_BROKERS: getKafkaBrokers(),
    KAFKA_SASL: config.has("kafka.sasl")
        ? config.get<{
              mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
              username: string;
              password: string;
          }>("kafka.sasl")
        : null,
    KAFKA_SSL: getKafkaSsl(),
    CORS: {
        origin: getCorsOrigin(),
        credentials: config.has("cors.credentials")
            ? config.get<boolean>("cors.credentials")
            : true,
    },
    // Payment gateway config
    PAYMENT_GATEWAY: config.get<PaymentGatewayType>("payment.gateway"),
    RAZORPAY_KEY_ID: config.get<string>("payment.razorpay.keyId"),
    RAZORPAY_KEY_SECRET: config.get<string>("payment.razorpay.keySecret"),
    STRIPE_SECRET_KEY: config.get<string>("payment.stripe.secretKey"),
    STRIPE_PUBLISHABLE_KEY: config.get<string>("payment.stripe.publishableKey"),
    STRIPE_WEBHOOK_SECRET: config.get<string>("payment.stripe.webhookSecret"),
    STRIPE_SUCCESS_URL: config.get<string>("payment.stripe.successUrl"),
    STRIPE_CANCEL_URL: config.get<string>("payment.stripe.cancelUrl"),
};
