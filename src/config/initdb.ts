import mongoose from "mongoose";
import { Config } from "./index";
import logger from "./logger";

export const initDB = async () => {
    try {
        await mongoose.connect(Config.DATABASE_URL);
        logger.info("Database connected successfully");
    } catch (error) {
        logger.error("Error connecting to database:", { error });
        process.exit(1);
    }
};
