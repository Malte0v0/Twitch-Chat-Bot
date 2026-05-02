import { sleep } from "../../utils/timeUtils.js";
import { splitLength } from "../../utils/inputUtils.js";
import { formatMessage } from "./messageFormatter.js";
import { chatClient } from "./chatClient.js";

export class ChatService {
    constructor(authService) {
        this.botId = process.env.BOT_ID;
        this.chatId = process.env.CHAT_CHANNEL_USER_ID;

        this.chatClient = new chatClient(authService, this.botId);

        this.lastMessage = undefined;
        this.messageQueue = [];
        this.isSending = false;
        this.rateLimitDelay = 1600;
    }

    get botUserId() {
        return this.botId;
    }

    get chatChannelUserId() {
        return this.chatId;
    }

    async sendChatMessage(message, channelUserId = this.chatId) {
        const messages = formatMessage(message, this.lastMessage);

        for (const message of messages) {
            this.messageQueue.push({
                message: message,
                channelUserId: channelUserId,
            });
        }

        this.processQueue();
    }

    async processQueue() {
        if (this.isSending) return;
        this.isSending = true;

        while (this.messageQueue.length > 0) {
            const { message, chatId } = this.messageQueue.shift();

            const success = await this.chatClient.sendMessage(message, chatId);
            if (!success) {
                console.warn("Requeuing failed message:", message);
                this.messageQueue.unshift({ message, chatId });
                await sleep(2000);
            } else {
                await sleep(this.rateLimitDelay);
            }
        }

        this.isSending = false;
    }
}
