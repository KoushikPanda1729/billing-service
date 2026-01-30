import app from "./app";
import { Config } from "./config/index";
import logger from "./config/logger";
import { initDB } from "./config/initdb";
import { createMessageBroker } from "./common/services/broker/MessageBrokerFactory";
import { handleMessage } from "./common/services/broker/messageHandler";

const startServer = async () => {
    const { PORT } = Config;
    let broker: ReturnType<typeof createMessageBroker> | null = null;

    try {
        await initDB();

        // Connect to message broker and start consumer
        broker = createMessageBroker();
        await broker.connect();
        logger.info("Message broker connected");

        await broker.consumeMessages(
            ["product", "topping"],
            "billing-service-group",
            handleMessage
        );
        logger.info("Message consumer started");

        app.listen(PORT, () =>
            logger.info(`Server is running on port ${PORT}`)
        );
    } catch (error) {
        logger.error("Error starting server:", { error });

        if (broker) {
            await broker
                .disconnect()
                .catch((err) =>
                    logger.error("Failed to disconnect broker:", err)
                );
        }

        process.exit(1);
    }
};

void startServer();
