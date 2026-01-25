import logger from "../../../config/logger";
import ProductModel from "../../../product/product-model";
import ToppingModel from "../../../topping/topping-model";
import type { Product } from "../../../product/product-types";
import type { Topping } from "../../../topping/topping-types";
import type { ConsumedMessage } from "../../types/broker";

export const handleMessage = async (message: ConsumedMessage) => {
    logger.info("Received message:", {
        topic: message.topic,
        partition: message.partition,
        offset: message.offset,
        key: message.key,
    });

    if (!message.value) {
        logger.warn("Empty message value");
        return;
    }

    const payload = JSON.parse(message.value) as {
        event: string;
        data: Product | Topping;
    };

    // Using upsert for idempotency - safe to process same message multiple times
    switch (payload.event) {
        case "product-created":
            // Upsert: creates if not exists, updates if exists (idempotent)
            await ProductModel.findByIdAndUpdate(
                payload.data._id,
                payload.data,
                { upsert: true, new: true }
            );
            logger.info("Product saved (idempotent):", {
                id: payload.data._id,
            });
            break;
        case "product-updated":
            await ProductModel.findByIdAndUpdate(
                payload.data._id,
                payload.data,
                { upsert: true, new: true }
            );
            logger.info("Product updated (idempotent):", {
                id: payload.data._id,
            });
            break;
        case "product-deleted":
            await ProductModel.findByIdAndDelete(payload.data._id);
            logger.info("Product deleted:", { id: payload.data._id });
            break;
        case "topping-created":
            // Upsert: creates if not exists, updates if exists (idempotent)
            await ToppingModel.findByIdAndUpdate(
                payload.data._id,
                payload.data,
                { upsert: true, new: true }
            );
            logger.info("Topping saved (idempotent):", {
                id: payload.data._id,
            });
            break;
        case "topping-updated":
            await ToppingModel.findByIdAndUpdate(
                payload.data._id,
                payload.data,
                { upsert: true, new: true }
            );
            logger.info("Topping updated (idempotent):", {
                id: payload.data._id,
            });
            break;
        case "topping-deleted":
            await ToppingModel.findByIdAndDelete(payload.data._id);
            logger.info("Topping deleted:", { id: payload.data._id });
            break;
        default:
            logger.warn("Unknown event:", { event: payload.event });
    }
};
