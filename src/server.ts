import app from "./app";
import { Config } from "./config/index";
import logger from "./config/logger";
import { initDB } from "./config/initdb";

const startServer = async () => {
    const { PORT } = Config;
    try {
        await initDB();
        app.listen(PORT, () =>
            logger.info(`Server is running on port ${PORT}`)
        );
    } catch (error) {
        logger.error("Error starting server:", { error });
        process.exit(1);
    }
};

void startServer();
