export interface MessageBrokerConfig {
    clientId: string;
    brokers: string[];
}

export interface Message {
    topic: string;
    key?: string;
    value: string;
    headers?: Record<string, string>;
}

export interface ConsumedMessage {
    topic: string;
    partition: number;
    offset: string;
    key: string | null;
    value: string | null;
    headers?: Record<string, string | undefined>;
}

export type MessageHandler = (message: ConsumedMessage) => Promise<void>;

export interface IMessageBroker {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    sendMessage(message: Message): Promise<void>;
    consumeMessages(
        topics: string[],
        groupId: string,
        handler: MessageHandler
    ): Promise<void>;
}
