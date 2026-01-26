import express, {
    type NextFunction,
    type Request,
    type Response,
} from "express";
import cors from "cors";
import logger from "./config/logger";
import type { HttpError } from "http-errors";
import customerRouter from "./customer/customer-route";
import couponRouter from "./coupon/coupon-route";
import orderRouter from "./order/order-route";
import taxRouter from "./tax/tax-route";
import deliveryRouter from "./delivery/delivery-route";
import paymentRouter from "./payment/payment-route";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req: Request, res: Response) => {
    res.status(200).send("Wellcome to billing service");
});

app.use("/customers", customerRouter);
app.use("/coupons", couponRouter);
app.use("/orders", orderRouter);
app.use("/taxes", taxRouter);
app.use("/delivery", deliveryRouter);
app.use("/payments", paymentRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
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
