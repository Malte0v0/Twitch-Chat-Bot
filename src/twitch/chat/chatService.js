import { sleep } from "../../utils/timeUtils.js";
import { formatMessage } from "./messageFormatter.js";
import { ChatClient } from "./chatClient.js";
import { logTime } from "../../errors/log.js";

export class ChatService {
    constructor(authService) {
        this._botUserId = process.env.BOT_USER_ID;
        this._chatUserId = process.env.CHAT_USER_ID;

        this.chatClient = new ChatClient(authService, this._botUserId);

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

        await this.processQueue();
    }

    sendMessage(message) {
        this.sendChatMessage(message).catch((error) => logTime(error));
    }

    async sendMessageAsync(message) {
        await this.sendChatMessage(message);
    }

    sendFormattedMessage(userName, message) {
        const messageFormatted = `@${userName}, ${message}`;
        this.sendChatMessage(messageFormatted).catch((error) => logTime(error));
    }

    async sendFormattedMessageAsync(userName, message) {
        const messageFormatted = `@${userName}, ${message}`;
        await this.sendChatMessage(messageFormatted);
    }

    async processQueue() {
        if (this.isSending) return;
        this.isSending = true;

        while (this.messageQueue.length > 0) {
            const { message, chatUserId } = this.messageQueue.shift();

            await this.chatClient.sendMessage(message, chatUserId);
            this.lastMessage = message;
            await sleep(this.rateLimitDelay);
        }

        this.isSending = false;
    }
}
