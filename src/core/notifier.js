export class Notifier {
    constructor(chatService) {
        this._chatService = chatService;
    }

    async notify(user, message) {
        await this._chatService.sendChatMessage(`@${user}, ${message}`);
    }

    notify(user, message) {
        this._chatService.sendChatMessage(`@${user}, ${message}`)
            .catch((error) => {console.error(error)});
    }
}