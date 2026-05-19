import { WebSocket } from "ws";
import { EventEmitter } from "events";
import { logTime } from "../errors/log.js";
import { ParseError, WebSocketError } from "../errors/errors.js";

export class EarthquakeClient extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.reconnectInterval = 1000;
    this.pingInterval = null;
    this.wsClient = null;
  }

  startPinging(intervalTimeMs = 15000) {
    this.stopPinging();
    this.pingInterval = setInterval(() => {
      if (this.wsClient.readyState === WebSocket.OPEN) {
        this.wsClient.ping();
      }
    }, intervalTimeMs);
  }

  stopPinging() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  connect() {
    logTime("Connecting to Earthquake WebSocket");
    this.wsClient = new WebSocket(this.url);

    this.wsClient.on("open", () => {
      logTime("WebSocket connection opened to " + this.url);
      this.reconnectInterval = 1000;
      this.startPinging();
    });

    this.wsClient.on("message", (data) => {
      try {
        const quakeRawJSON = JSON.parse(data.toString());
        this.emit("quake", quakeRawJSON);
      } catch (error) {
        this.emit(
          "error",
          new ParseError(
            `Failed to parse quake message: ${error.message}`,
            error,
          ),
        );
      }
    });

    this.wsClient.on("error", (error) => {
      logTime(`Earthquake WebSocket error: ${error.message}`, 3);
      this.emit(
        "error",
        new WebSocketError(
          `Earthquake WebSocket error: ${error.message}`,
          error,
        ),
      );
    });

    this.wsClient.on("close", (code, reason) => {
      logTime(
        `Earthquake websocket was closed. Code: ${code} Reason: ${reason}`,
        2,
      );
      this.stopPinging();
      this.emit("close", code, reason);
      this.reconnect();
    });
  }

  disconnect() {
    // Close if ws exists
    this.stopPinging();
    this.wsClient?.close();
  }

  reconnect() {
    logTime(
      `Earthquake WebSocket reconnecting in ${this.reconnectInterval}ms...`,
      2,
    );
    setTimeout(() => {
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000);
      this.connect();
    }, this.reconnectInterval);
  }
}
