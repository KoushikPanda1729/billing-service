import winston from "winston";

const logger = winston.createLogger({
    level: "info",
    defaultMeta: {
        seviceName: "auth-service",
    },
    transports: [
        new winston.transports.File({
            level: "info",
            dirname: "logs",
            filename: "combined.log",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            silent: true,
        }),
        new winston.transports.File({
            level: "error",
            dirname: "logs",
            filename: "error.log",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            silent: true,
        }),
        new winston.transports.Console({
            level: "info",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            silent: false,
        }),
    ],
});

export default logger;
