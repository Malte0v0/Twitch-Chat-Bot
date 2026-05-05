// Send the nitter versions of x links
export class NitterService {
    constructor(chatService) {
        this._chatService = chatService;

        this._xRegex = new RegExp(`https?:\\/\\/(www\\.)?[x]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)`, "g"); 
    }

    async sendNitterIfX(messageText) {
        const matches = messageText.match(this._xRegex)
        if (matches) {
            for (const match of matches) {
                const result = match.replace("x.com", "nitter.net")
                await this._chatService.sendChatMessage(result);
            }
        }
    }
}