import app from "./app";
import { Config } from "./config/index";
import logger from "./config/logger";
import { initDB } from "./config/initdb";
import { createMessageBroker } from "./common/services/broker/MessageBrokerFactory";

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
                (message) => {
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
                            data: unknown;
                        };
                        switch (payload.event) {
                            case "product-created":
                                logger.info("Product created:", payload.data);
                                // TODO: Handle product created event
                                break;
                            case "product-updated":
                                logger.info("Product updated:", payload.data);
                                // TODO: Handle product updated event
                                break;
                            case "product-deleted":
                                logger.info("Product deleted:", payload.data);
                                // TODO: Handle product deleted event
                                break;
                            case "topping-created":
                                logger.info("Topping created:", payload.data);
                                // TODO: Handle topping created event
                                break;
                            case "topping-updated":
                                logger.info("Topping updated:", payload.data);
                                // TODO: Handle topping updated event
                                break;
                            case "topping-deleted":
                                logger.info("Topping deleted:", payload.data);
                                // TODO: Handle topping deleted event
                                break;
                            default:
                                logger.warn("Unknown event:", payload.event);
                        }
                    }
                    return Promise.resolve();
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
