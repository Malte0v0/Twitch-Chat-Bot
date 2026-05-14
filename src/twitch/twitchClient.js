import { HeartrateMonitor } from "./heartrateMonitor.js";
import { EventEmitter } from "events";
import { WebSocket } from "ws";
import { EventSubClient } from "./eventSubClient.js";
import { logTime } from "../errors/log.js";

export class TwitchClient extends EventEmitter {
    constructor(url) {
        super();

        this.defaultUrl = url;

        this.ws = null;

        this.heartrateMonitor = null;

        this._sessionId = null;
        this._status = null;

        this.eventSubClient = new EventSubClient();
    }

    get sessionId() {
        return this._sessionId;
    }

    get status() {
        return this._status;
    }

    start(url = this.defaultUrl) {
        this.startHeartrateMonitor();
        this.connect(url);
    }

    stop() {
        this.stopHeartrateMonitor();
        this.disconnect();
    }

    startHeartrateMonitor() {
        this.heartrateMonitor = new HeartrateMonitor(this);
        this.heartrateMonitor.start();
    }

    stopHeartrateMonitor() {
        if (this.heartrateMonitor) {
            this.heartrateMonitor.stop();
            this.heartrateMonitor = null;
        }
    }

    registerEventSub(sessionId) {
        this.eventSubClient.registerEventSubListeners(sessionId);
        logTime(`${sessionId} Subscribed to Twitch eventsub`);
    }

    connect(url = this.defaultUrl) {
        console.log("Connecting to Twitch WebSocket");
        this.ws = new WebSocket(url);

        this.ws.on("open", () => {
            console.log("Twitch WebSocket connection opened to " + url);
        });

        this.ws.on("message", (raw) => {
            const data = JSON.parse(raw);
            const messageType = data.metadata.message_type;

            const session = data.payload.session;

            this.emit("message", data);

            switch (messageType) {
                case "session_welcome":
                    this._sessionId = session.id;
                    this._status = session.status;
                    if (this._status != "reconnecting") {
                        this.registerEventSub(session.id);
                    }
                    this.emit("welcome", session);
                    console.log(`(${this._sessionId}) session_welcome`);
                    break;
                case "session_keepalive":
                    this.emit("keepalive");
                    break;
                case "notification":
                    this.emit("notification", data);
                    break;
                case "session_reconnect":
                    this._status = session.status;
                    this.emit("reconnect", session);
                    console.log(`(${this._sessionId}) reconnect`);
                    break;
                case "revocation":
                    this.emit("revocation");
                    break;
            }
        });

        this.ws.on("error", (error) => {
            console.error(
                `(${this._sessionId}) Twitch WebSocket error: ` + error,
            );
            this.emit("error", error);
            this.reconnect();
        });

        this.ws.on("close", (code, reason) => {
            console.warn(
                `(${this._sessionId}) Twitch WebSocket was closed`,
                code,
            );
            this.emit("close", code, reason);
            // this.disconnect(this.ws);
        });
    }

    disconnect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close();
    }

    reconnect() {
        this.stop();
        this.start();
    }
}
