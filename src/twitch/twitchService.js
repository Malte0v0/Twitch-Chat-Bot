import { logTime } from "../errors/log.js";
import { TwitchConnection } from "./twitchConnection.js";

const TWITCH_WS_URL = "wss://eventsub.wss.twitch.tv/ws";
// const TWITCH_WS_URL = "ws://127.0.0.1:8080/ws";

export class TwitchService {
    #connection = null;
    #handlers;
    #running = false;

    constructor(handlers = {}) {
        this.#handlers = handlers;
    }
 
    start() {
        if (this.#running) return;
        this.#running = true;
        this.#connect(TWITCH_WS_URL);
    }
 
    stop() {
        this.#running = false;
        this.#connection?.close();
        this.#connection = null;
    }
 
    #connect(url = TWITCH_WS_URL, isReconnect = false) {
        const conn = new TwitchConnection(url, isReconnect);
 
        conn.on("notification", (data) => {
            this.#handlers.onNotification?.(data);
        });
 
        conn.on("reconnect", (reconnectUrl) => {
            logTime("Soft reconnect initiated");
            const next = this.#connect(reconnectUrl, true);
            next.once("welcome", () => conn.close());
        });
 
        conn.on("dead", () => {
            if (!this.#running) return;
            logTime("Hard reconnect, starting fresh connection", 2);
            this.#connect();
            conn.close();
        });
 
        conn.on("closed", () => {
            if (this.#running && this.#connection === conn) {
                this.#connect();
            }
        });
 
        conn.on("error", (error) => {
          logTime(`(${conn.sessionId}) Twitch WebSocket error ${error}`, 3);
        });
 
        conn.open();
        this.#connection = conn;
        return conn;
    }
}
