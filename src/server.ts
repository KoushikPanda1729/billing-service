import app from "./app";
import { Config } from "./config/index";
import logger from "./config/logger";
import { initDB } from "./config/initdb";
import { createMessageBroker } from "./common/services/broker/MessageBrokerFactory";
import ProductModel from "./product/product-model";
import ToppingModel from "./topping/topping-model";
import type { Product } from "./product/product-types";
import type { Topping } from "./topping/topping-types";

const startServer = async () => {
    const { PORT } = Config;
    try {
        await initDB();

        // Connect to message broker and start consumer
        try {
            const broker = createMessageBroker();
            await broker.connect();
            logger.info("Message broker connected");

            // Start consuming messages from product and topping topics
            await broker.consumeMessages(
                ["product", "topping"],
                "billing-service-group",
                async (message) => {
                    logger.info("Received message:", {
                        topic: message.topic,
                        partition: message.partition,
                        offset: message.offset,
                        key: message.key,
                        value: message.value,
                    });

                    // Handle different events
                    if (message.value) {
                        const payload = JSON.parse(message.value) as {
                            event: string;
                            data: Product | Topping;
                        };
                        switch (payload.event) {
                            case "product-created":
                                await ProductModel.create(payload.data);
                                logger.info("Product saved:", payload.data);
                                break;
                            case "product-updated":
                                await ProductModel.findByIdAndUpdate(
                                    payload.data._id,
                                    payload.data
                                );
                                logger.info("Product updated:", payload.data);
                                break;
                            case "product-deleted":
                                await ProductModel.findByIdAndDelete(
                                    payload.data._id
                                );
                                logger.info("Product deleted:", payload.data);
                                break;
                            case "topping-created":
                                await ToppingModel.create(payload.data);
                                logger.info("Topping saved:", payload.data);
                                break;
                            case "topping-updated":
                                await ToppingModel.findByIdAndUpdate(
                                    payload.data._id,
                                    payload.data
                                );
                                logger.info("Topping updated:", payload.data);
                                break;
                            case "topping-deleted":
                                await ToppingModel.findByIdAndDelete(
                                    payload.data._id
                                );
                                logger.info("Topping deleted:", payload.data);
                                break;
                            default:
                                logger.warn("Unknown event:", payload.event);
                        }
                    }
                }
            );
            logger.info("Message consumer started");
        } catch (err) {
            logger.error("Failed to connect to message broker:", err);
        }

        app.listen(PORT, () =>
            logger.info(`Server is running on port ${PORT}`)
        );
    } catch (error) {
        logger.error("Error starting server:", { error });
        process.exit(1);
    }
};

void startServer();
