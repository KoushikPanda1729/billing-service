import app from "./app";
import { Config } from "./config/index";
import logger from "./config/logger";
import { initDB } from "./config/initdb";
import { createMessageBroker } from "./common/services/broker/MessageBrokerFactory";
import { handleMessage } from "./common/services/broker/messageHandler";

const startServer = async () => {
    const { PORT } = Config;
    try {
        await initDB();

        // Connect to message broker and start consumer
        try {
            const broker = createMessageBroker();
            await broker.connect();
            logger.info("Message broker connected");

            await broker.consumeMessages(
                ["product", "topping"],
                "billing-service-group",
                handleMessage
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
