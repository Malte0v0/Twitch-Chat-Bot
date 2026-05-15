import { logTime } from "../errors/log.js";
import { TwitchClient } from "./twitchClient.js";
import { TwitchMessageHandler } from "./twitchMessageHandler.js";

export class TwitchService {
    constructor(commandPrefix, commandController) {
        this.defaultWsUrl = "wss://eventsub.wss.twitch.tv/ws";
        // this.defaultWsUrl = "ws://127.0.0.1:8080/ws";

        this.commandPrefix = commandPrefix;
        this.commandRegex = new RegExp(
            `^(?:\\${this.commandPrefix})(\\w+)(\\s.*)?`,
        );

        this.twitchClient = new TwitchClient(this.defaultWsUrl);
        this.twitchMessageHandler = new TwitchMessageHandler(
            this.commandPrefix,
            this.commandRegex,
        );
        this.commandController = commandController;
    }

    start() {
        this.twitchClient.start();
        this.startListening(this.twitchClient);
    }

    stop() {
        this.twitchClient.stop();
        this.stopListening(this.twitchClient);
    }

    startListening(twitchClient) {
        this._onNotification = (data) => {
            this.twitchMessageHandler.handleMessage(data);
        };
        this._onReconnect = (session) => {
            this.reconnect(session.reconnect_url, session.status);
        };
        this._onHardReconnect = () => {
            this.reconnect();
        };
        this._onCommand = (command, messageText, data) => {
            this.commandController.handleCommand(command, messageText, data);
        };
        this._onError = (error) => {
            logTime(error, 3);
            // TEMP TODO error handling TwitchService
        };

        twitchClient.on("notification", this._onNotification);
        twitchClient.on("reconnect", this._onReconnect);
        twitchClient.on("hard_reconnect", this._onHardReconnect);
        twitchClient.on("error", this._onError);
        this.twitchMessageHandler.on("command", this._onCommand);
    }

    stopListening(twitchClient) {
        twitchClient.off("notification", this._onNotification);
        twitchClient.off("reconnect", this._onReconnect);
        twitchClient.off("hard_reconnect", this._onHardReconnect);
        twitchClient.off("error", this._onError);
        this.twitchMessageHandler.off("command", this._onCommand);
    }

    reconnect(url = this.defaultWsUrl, reason = null) {
        if (reason) logTime(`Twitch WebSocket reconnecting due to: ${reason}`);

        const oldClient = this.twitchClient;
        this.twitchClient = new TwitchClient(url);
        oldClient.stopHeartrateMonitor();

        if (oldClient.status === "reconnecting") {
            this.twitchClient.once("welcome", () => {
                oldClient.stop();
            });
            this.twitchClient.start(url);
        } else {
            oldClient.once("close", () => {
                this.twitchClient.start();
            });
            oldClient.stop();
        }

        this.stopListening(oldClient);
        this.startListening(this.twitchClient);
    }
}
