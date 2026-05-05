import { HeartrateMonitor } from "./heartrateMonitor.js";
import { EventEmitter } from "events";
import { WebSocket } from "ws";
import { EventSubClient } from "./eventSubClient.js";

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

    start(url = this.defaultWsUrl) {
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
        this.heartrateMonitor.stop();
    }

    registerEventSub(sessionId) {
        this.eventSubClient.registerEventSubListeners(sessionId);
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

            switch (messageType) {
                case "session_welcome":
                    this._sessionId = session.id;
                    this._status = session.status;
                    this.registerEventSub(session.id);
                    this.emit("welcome", session);
                    console.log(`(${this._sessionId}) session_welcome`);
                    break;
                case "session_keepalive":
                    this.heartrateMonitor.insertLastKeepaliveMessage(
                        Date.now(),
                    );
                    this.emit("keepalive");
                    break;
                case "notification":
                    this.emit("message", data);
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
            this.disconnect(this.ws);
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
