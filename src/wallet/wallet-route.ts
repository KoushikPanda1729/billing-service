import express, {
    type Request,
    type Response,
    type NextFunction,
} from "express";
import { WalletController } from "./wallet-controller";
import { WalletService } from "./wallet-service";
import { WalletModel, WalletTransactionModel } from "./wallet-model";
import logger from "../config/logger";
import { calculateCashbackValidator } from "./wallet-validator";
import { authenticate } from "../common/middleware/authenticate";

const router = express.Router();

const walletService = new WalletService(
    WalletModel,
    WalletTransactionModel,
    logger
);
const walletController = new WalletController(walletService, logger);

// Get wallet balance (authenticated)
router.get(
    "/balance",
    authenticate,
    (req: Request, res: Response, next: NextFunction) =>
        walletController.getBalance(req, res, next)
);

// Get transaction history (authenticated)
router.get(
    "/transactions",
    authenticate,
    (req: Request, res: Response, next: NextFunction) =>
        walletController.getTransactions(req, res, next)
);

// Calculate potential cashback (authenticated)
router.post(
    "/calculate-cashback",
    authenticate,
    calculateCashbackValidator,
    (req: Request, res: Response, next: NextFunction) =>
        walletController.calculateCashback(req, res, next)
);

export default router;
