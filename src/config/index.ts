import { config } from "dotenv";
config();

const { PORT, NODE_ENV } = process.env;

export const Config = {
    PORT: PORT,
    NODE_ENV: NODE_ENV,
};
