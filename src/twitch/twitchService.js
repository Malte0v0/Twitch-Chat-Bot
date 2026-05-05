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
        this.startListening();
    }

    stop() {
        this.twitchClient.stop();
        this.stopListening();
    }

    startListening() {
        this._onMessage = (data) => {
            this.twitchMessageHandler.handleMessage(data);
        };

        this._onReconnect = (session) => {
            this.reconnect(session.reconnect_url, session.status);
        };

        this._onCommand = (command, messageText, data) => {
            this.commandController.handleCommand(command, messageText, data);
        };

        this.twitchClient.on("message", this._onMessage);

        this.twitchClient.on("reconnect", this._onReconnect);

        this.twitchMessageHandler.on("command", this._onCommand);
    }

    stopListening() {
        this.twitchClient.off("message", this._onMessage);
        this.twitchClient.off("reconnect", this._onReconnect);
        this.twitchMessageHandler.off("command", this._onCommand);
    }

    reconnect(url, reason = null) {
        if (reason)
            console.log(`Twitch WebSocket reconnecting due to: ${reason}`);

        // Make a new connection before disconnecting the old one
        const oldClient = this.twitchClient;
        this.twitchClient = new TwitchClient(this.defaultWsUrl);
        this.twitchClient.start(url);

        if (oldClient.status == "reconnecting") {
            this.twitchClient.on("welcome", () => {
                oldClient.disconnect();
                oldClient.stop();
            });
        } else {
            oldClient.disconnect();
            oldClient.stop();
        }
    }
}
