import app from "./app";
import { Config } from "./config/index";
import logger from "./config/logger";

const startServer = () => {
    const { PORT } = Config;
    try {
        app.listen(PORT, () =>
            logger.info(`Server is running on port ${PORT}`)
        );
    } catch (error) {
        logger.error("Error starting server:", { error });
        process.exit(1);
    }
};

startServer();
