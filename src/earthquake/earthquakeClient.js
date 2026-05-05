import { WebSocket } from "ws";
import { EventEmitter } from "events";

export class EarthquakeClient extends EventEmitter {
    constructor(url) {
        super();
        this.url = url;
        this.reconnectInterval = 1000;

        this.pingInterval = null;
        this.wsClient = null;
    }

    startPinging(intervalTimeMs = 15000) {
        this.pingInterval = setInterval(() => {
            if (this.wsClient.readyState === WebSocket.OPEN) {
                this.wsClient.ping();
            }
        }, intervalTimeMs);
    }

    stopPinging() {
        clearInterval(this.pingInterval);
    }

    connect() {
        console.log("Connecting to Earthquake WebSocket");
        this.wsClient = new WebSocket(this.url);

        this.wsClient.on("open", () => {
            console.log("WebSocket connection opened to " + this.url);
            this.startPinging();
        });

        this.wsClient.on("message", (data) => {
            const quakeRawJSON = JSON.parse(data.toString());
            this.emit("quake", quakeRawJSON);
        });

        this.wsClient.on("error", (error) => {
            console.error(error);
            this.emit("error", error);
            this.reconnect();
        });

        this.wsClient.on("close", (code, reason) => {
            console.warn("Earthquake websocket was closed", code, reason);
            this.emit("close", (code, reason));
            this.reconnect();
        });
    }

    disconnect() {
        // Close if ws exists
        this.ws?.close();
    }

    reconnect() {
        setTimeout(() => {
            this.reconnectInterval = Math.min(
                this.reconnectInterval * 2,
                30000,
            );
            this.connect();
        }, this.reconnectInterval);
    }
}
