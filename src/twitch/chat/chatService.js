import { sleep } from "../../utils/timeUtils.js";
import { formatMessage } from "./messageFormatter.js";
import { chatClient } from "./chatClient.js";

export class ChatService {
    constructor(authService) {
        this._botUserId = process.env.BOT_USER_ID;
        this._chatUserId = process.env.CHAT_USER_ID;

        this.chatClient = new chatClient(authService, this._botUserId);

        this.lastMessage = undefined;
        this.messageQueue = [];
        this.isSending = false;
        this.rateLimitDelay = 1600;
    }

    get botUserId() {
        return this._botUserId;
    }

    get chatChannelUserId() {
        return this._chatUserId;
    }

    async sendChatMessage(message, chatUserId = this._chatUserId) {
        const messages = formatMessage(message, this.lastMessage);

        for (const message of messages) {
            this.messageQueue.push({
                message: message,
                chatUserId: chatUserId,
            });
        }

        this.processQueue();
    }

    sendMessage(message) {
        this.sendChatMessage(message).catch((error) => console.warn(error));
    }

    sendFormattedMessage(userName, message) {
        const messageFormatted = `@${userName}, ${message}`;
        this.sendChatMessage(messageFormatted).catch((error) =>
            console.warn(error),
        );
    }

    async processQueue() {
        if (this.isSending) return;
        this.isSending = true;

        while (this.messageQueue.length > 0) {
            const { message, chatUserId } = this.messageQueue.shift();

            const success = await this.chatClient.sendMessage(
                message,
                chatUserId,
            );
            if (!success) {
                console.warn("Requeuing failed message:", message);
                this.messageQueue.unshift({ message, chatUserId });
                await sleep(2000);
            } else {
                this.lastMessage = message;
                await sleep(this.rateLimitDelay);
            }
        }

        this.isSending = false;
    }
}
