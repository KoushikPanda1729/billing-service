import config from "config";

export const Config = {
    PORT: config.get<number>("server.port"),
    HOST: config.get<string>("server.host"),
    DATABASE_URL: config.get<string>("database.url"),
    JWKS_URI: config.get<string>("auth.jwksUri"),
};
