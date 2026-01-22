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

    switch (payload.event) {
        case "product-created":
            await ProductModel.create(payload.data);
            logger.info("Product saved:", { id: payload.data._id });
            break;
        case "product-updated":
            await ProductModel.findByIdAndUpdate(
                payload.data._id,
                payload.data
            );
            logger.info("Product updated:", { id: payload.data._id });
            break;
        case "product-deleted":
            await ProductModel.findByIdAndDelete(payload.data._id);
            logger.info("Product deleted:", { id: payload.data._id });
            break;
        case "topping-created":
            await ToppingModel.create(payload.data);
            logger.info("Topping saved:", { id: payload.data._id });
            break;
        case "topping-updated":
            await ToppingModel.findByIdAndUpdate(
                payload.data._id,
                payload.data
            );
            logger.info("Topping updated:", { id: payload.data._id });
            break;
        case "topping-deleted":
            await ToppingModel.findByIdAndDelete(payload.data._id);
            logger.info("Topping deleted:", { id: payload.data._id });
            break;
        default:
            logger.warn("Unknown event:", { event: payload.event });
    }
};
