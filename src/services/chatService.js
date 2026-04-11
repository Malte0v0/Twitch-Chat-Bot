import { sleep } from "../utils/timeUtils.js"
import { splitLength } from "../utils/inputUtils.js"

export class ChatService {
    constructor(authService) {
        this.authService = authService;

        this._botUserId = "1225554271";
        this._chatChannelUserId = process.env.CHAT_CHANNEL_USER_ID;

        this._lastMessage = undefined;
        this._messageQueue = [];
        this._isSending = false;
        this._rateLimitDelay = 1600;
    }

    get botUserId() {return this._botUserId;}

    get chatChannelUserId() {return this._chatChannelUserId;}

    async sendChatMessage(chatMessage, channelUserId=this._chatChannelUserId) {
        // Make sure you dont send the same string multple times in a row
        if (this._lastMessage === chatMessage) {
            chatMessage = chatMessage.endsWith(".")
                ? chatMessage.slice(0, -1)
                : chatMessage + ".";
        }
        this._lastMessage = chatMessage;

        const messages = chatMessage.length > 500
            ? splitLength(chatMessage, 500)
            : [chatMessage];

        for (const message of messages) {
            this._messageQueue.push({message: message, channelUserId: channelUserId});
        }

        this._processQueue();
    }

    async _processQueue() {
        if (this._isSending) return;
        this._isSending = true;

        while (this._messageQueue.length > 0) {
            const { message, channelUserId } = this._messageQueue.shift();

            const success = await this._trySendMessage(message, channelUserId);
            if (!success) {
                console.warn("Requeuing failed message:", message);
                this._messageQueue.unshift({ message, channelUserId });
                await sleep(2000);
            } else {
                await sleep(this._rateLimitDelay);
            }
        }

        this._isSending = false;
    }

    async _trySendMessage(message, channelUserId) {
        try {
            const response = await fetch('https://api.twitch.tv/helix/chat/messages', {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this.authService.oauthToken,
                    "Client-Id": this.authService.clientId,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    broadcaster_id: channelUserId,
                    sender_id: this._botUserId,
                    message: message
                })
            });
            
            if (response.status === 401 || response.status === 403) {
                await this.authService.refreshOAuthToken();
                return false;
            } else if (response.status === 429) {
                console.log("Rate limit reached, retrying in 2 seconds...");
                await sleep(2000);
                return false;
            } else if (!response.ok) {
                let data = await response.json();
                console.error("Failed to send chat message");
                console.error(data);
                return false;
            } 
    
            return true;
        } catch (error) {
            console.error("Network or other error:", error);
            return false;
        }
    }
}