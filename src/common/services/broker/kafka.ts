import { Kafka, type Producer, type Consumer } from "kafkajs";
import type {
    IMessageBroker,
    Message,
    MessageBrokerConfig,
    MessageHandler,
} from "../../types/broker";

export class KafkaBroker implements IMessageBroker {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer | null = null;

    constructor(
        private config: MessageBrokerConfig,
        private groupId?: string
    ) {
        this.kafka = new Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
        });
        this.producer = this.kafka.producer();
    }

    async connect(): Promise<void> {
        await this.producer.connect();
    }

    async disconnect(): Promise<void> {
        await this.producer.disconnect();
        if (this.consumer) {
            await this.consumer.disconnect();
        }
    }

    async sendMessage(message: Message): Promise<void> {
        await this.producer.send({
            topic: message.topic,
            messages: [
                {
                    key: message.key ?? null,
                    value: message.value,
                    ...(message.headers && { headers: message.headers }),
                },
            ],
        });
    }

    async consumeMessages(
        topics: string[],
        groupId: string,
        handler: MessageHandler
    ): Promise<void> {
        this.consumer = this.kafka.consumer({ groupId });
        await this.consumer.connect();

        await this.consumer.subscribe({
            topics,
            fromBeginning: true,
        });

        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                await handler({
                    topic,
                    partition,
                    offset: message.offset,
                    key: message.key?.toString() ?? null,
                    value: message.value?.toString() ?? null,
                    headers: message.headers as Record<
                        string,
                        string | undefined
                    >,
                });
            },
        });
    }
}
