import express, {
    type NextFunction,
    type Request,
    type Response,
} from "express";
import logger from "./config/logger";
import type { HttpError } from "http-errors";

const app = express();

app.get("/", (req: Request, res: Response) => {
    res.status(200).send("Wellcome to auth service");
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
    logger.error(err.message);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        errors: [
            {
                type: err.name,
                message: err.message,
                path: "",
                location: "",
            },
        ],
    });
});
export default app;
