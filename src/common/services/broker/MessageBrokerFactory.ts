import { Config } from "../../../config";
import { KafkaBroker } from "./kafka";
import type { IMessageBroker } from "../../types/broker";

let broker: IMessageBroker | null = null;

export const createMessageBroker = (): IMessageBroker => {
    if (!broker) {
        const brokerType = Config.BROKER_TYPE.toLowerCase();

        switch (brokerType) {
            case "kafka":
                broker = new KafkaBroker({
                    clientId: Config.KAFKA_CLIENT_ID,
                    brokers: Config.KAFKA_BROKERS,
                    sasl: Config.KAFKA_SASL,
                    ssl: Config.KAFKA_SSL,
                });
                break;
            default:
                throw new Error(
                    `Unsupported broker type: ${brokerType}. Currently only 'kafka' is supported.`
                );
        }
    }
    return broker;
};
