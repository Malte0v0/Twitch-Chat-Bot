export class TimeService {
    constructor(chatService) {
        this._chatService = chatService;
    }

    getTimeString(timezone) {
        return new Date().toLocaleTimeString("en-US", {timeZone: timezone});
    }

    async timeCommand() {
        await this._chatService.sendChatMessage(`EU ${this.getTimeString("Europe/Stockholm")}`);
        await this._chatService.sendChatMessage(`Barry63 ${this.getTimeString("Europe/London")}`)
        await this._chatService.sendChatMessage(`TrumpSalute ${this.getTimeString("America/New_York")}`)
    }
}