export class TimeService {
    constructor(chatService) {
        this._chatService = chatService;

        this._options = {
            timeZone: "",
            timeZoneName: "short",
            hour: "2-digit",
            minute: "2-digit"
        }
    }

    getTimeString(timezone) {
        this._options.timeZone = timezone;
        return new Date().toLocaleTimeString("en-US", this._options);
    }

    async timeCommand() {
        await this._chatService.sendChatMessage(`EU ${this.getTimeString("Europe/Stockholm")}`);
        await this._chatService.sendChatMessage(`Barry63 ${this.getTimeString("Europe/London")}`)
        await this._chatService.sendChatMessage(`TrumpSalute ${this.getTimeString("America/New_York")}`)
    }
}