import { logTime } from "../errors/log.js";
import { TwitchConnection } from "./twitchConnection.js";

const TWITCH_WS_URL = "wss://eventsub.wss.twitch.tv/ws";
// const TWITCH_WS_URL = "ws://127.0.0.1:8080/ws";

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const MAX_CONSECUTIVE_FAILURES = 10;

export class TwitchService {
  #connection = null;
  #handlers;
  #authService;
  #running = false;
  #reconnectTimer = null;
  #reconnectDelayMs = BASE_RECONNECT_DELAY_MS;
  #consecutiveFailures = 0;

  constructor(authService, handlers = {}) {
    this.#authService = authService;
    this.#handlers = handlers;
  }

  start() {
    if (this.#running) return;
    this.#running = true;
    this.#connect(TWITCH_WS_URL);
  }

  stop() {
    this.#running = false;
    clearTimeout(this.#reconnectTimer);
    this.#connection?.close();
    this.#connection = null;
  }

  // Give up and let pm2 (or another process supervisor) restart the process
  // after too many reconnect attempts fail in a row.
  #scheduleReconnect(reconnectFn) {
    this.#consecutiveFailures++;
    if (this.#consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
      logTime(
        `Twitch connection failed ${this.#consecutiveFailures} times in a row, exiting so the process supervisor can restart`,
        3,
      );
      process.exit(1);
    }

    logTime(`Reconnecting to Twitch in ${this.#reconnectDelayMs}ms...`, 2);
    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = setTimeout(reconnectFn, this.#reconnectDelayMs);
    this.#reconnectDelayMs = Math.min(
      this.#reconnectDelayMs * 2,
      MAX_RECONNECT_DELAY_MS,
    );
  }

  #connect(url = TWITCH_WS_URL, isReconnect = false) {
    const conn = new TwitchConnection(this.#authService, url, isReconnect);

    conn.on("notification", (data) => {
      this.#handlers.onNotification?.(data);
    });

    conn.on("ready", () => {
      this.#consecutiveFailures = 0;
      this.#reconnectDelayMs = BASE_RECONNECT_DELAY_MS;
    });

    conn.on("reconnect", (reconnectUrl) => {
      logTime("Soft reconnect initiated");
      const next = this.#connect(reconnectUrl, true);
      next.once("welcome", () => conn.close());
    });

    conn.on("dead", () => {
      if (!this.#running) return;
      logTime("Hard reconnect, starting fresh connection", 2);
      conn.close();
      this.#scheduleReconnect(() => this.#connect());
    });

    conn.on("closed", () => {
      if (this.#running && this.#connection === conn) {
        this.#scheduleReconnect(() => this.#connect());
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
