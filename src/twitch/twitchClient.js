import { HeartrateMonitor } from "./heartrateMonitor.js";
import { EventEmitter } from "events";
import { WebSocket } from "ws";
import { EventSubClient } from "./eventSubClient.js";
import { logTime } from "../errors/log.js";
import { EventSubError, ParseError, WebSocketError } from "../errors/errors.js";

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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
            logTime(`${this._sessionId} Twitch WebSocket closed`);
        }
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

    reconnect() {
        if (this.ws) {
            this.ws.once("close", () => {
                this.start();
            });
            this.stop();
        } else {
            this.start();
        }
    }

    async registerEventSub(sessionId) {
        await this.eventSubClient.registerEventSubListeners(sessionId);
        logTime(`${sessionId} Subscribed to Twitch eventsub`);
    }

    connect(url = this.defaultUrl) {
        logTime("Connecting to Twitch WebSocket");
        this.ws = new WebSocket(url);

        this.ws.on("open", () => {
            logTime("Twitch WebSocket connection opened to " + url);
        });

        this.ws.on("message", (raw) => {
            let data;

            try {
                data = JSON.parse(raw);
            } catch (error) {
                this.emit(
                    "error",
                    new ParseError(
                        "Failed to parse Twitch WebSocket message",
                        error,
                    ),
                );
                return;
            }

            const messageType = data.metadata.message_type;
            const session = data.payload.session;

            this.emit("message", data);

            switch (messageType) {
                case "session_welcome":
                    this._sessionId = session.id;
                    this._status = session.status;
                    if (this._status != "reconnecting") {
                        this.registerEventSub(session.id).catch((error) => {
                            this.emit(
                                "error",
                                new EventSubError(
                                    `${this._sessionId} Failed to register Twitch EventSub`,
                                    error,
                                ),
                            );
                        });
                    }
                    this.emit("welcome", session);
                    logTime(`(${this._sessionId}) session_welcome`);
                    break;
                case "notification":
                    this.emit("notification", data);
                    break;
                case "session_reconnect":
                    this._status = session.status;
                    this.emit("reconnect", session);
                    logTime(`(${this._sessionId}) reconnect`);
                    break;
            }
        });

        this.ws.on("error", (error) => {
            this.emit(
                "error",
                new WebSocketError(
                    `${this._sessionId} Twitch WebSocket error`,
                    error,
                ),
            );
        });

        this.ws.on("close", (code, reason) => {
            logTime(
                `(${this._sessionId}) Twitch WebSocket was closed ${code}`,
                2,
            );
            this.emit("close", code, reason);
        });
    }
}
