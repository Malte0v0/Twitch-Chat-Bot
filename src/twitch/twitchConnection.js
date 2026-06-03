import { EventEmitter } from "events";
import { logTime } from "../errors/log.js";
import { EventSubClient } from "./eventSubClient.js";
import WebSocket from "ws";

const TWITCH_WS_URL = "wss://eventsub.wss.twitch.tv/ws";
const KEEPALIVE_GRACE_SECONDS = 5;

export class TwitchConnection extends EventEmitter {
  #ws             = null;
  #sessionId      = null;
  #keepaliveTimer = null;
  #keepaliveMs    = null;
  #closing        = false;
  #isReconnect;
  #eventSubClient = new EventSubClient();
  #url;

  constructor(url = TWITCH_WS_URL, isReconnect) {
    super();
    this.#url         = url;
    this.#isReconnect = isReconnect;
  }

  get sessionId() { return this.#sessionId; }
  get url()       { return this.#url; }

  open() {
    logTime("Connecting to Twitch...");
    this.#ws = new WebSocket(this.#url);

    this.#ws.on("open",     ()              => { logTime(`Connected: ${this.#url}`) });
    this.#ws.on("message",  (raw)           => { this.#onMessage(raw) })
    this.#ws.on("error",    (error)         => { this.#onError(error) })
    this.#ws.on("close",    (code, buffer)  => { this.#onClose(code, buffer) })
  }

  close() {
    if (this.#closing) return;
    this.#closing = true;
    this.#clearKeepalive();

    if(this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.close();
    } else {
      this.emit("closed", null, null);
    }
  }


  // WebSocket handlers

  #onMessage(raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      this.emit("error", new Error("Failed to parse WebSocket message"));
      return;
    }

    this.#resetKeepalive();

    const type    = data?.metadata?.message_type;
    const session = data?.payload?.session;

    switch (type) {
      case "session_welcome":
        this.#sessionId = session.id;
        this.#keepaliveMs = (session.keepalive_timeout_seconds + KEEPALIVE_GRACE_SECONDS) * 1000;
        this.#resetKeepalive();
        logTime(`(${this.#sessionId}) Twitch WebSocket received welcome message`)
        if (!this.#isReconnect) this.#registerEventSub(session.id);
        this.emit("welcome", session);
        break;
      
      case "session_keepalive":
        break;

      case "session_reconnect":
        logTime(`(${this.#sessionId}) Twitch requested reconnect`)
        this.emit("reconnect", session.reconnect_url);
        break;

      case "notification":
        this.emit("notification", data);
        break;

      default:
        break;
    }
  }

  #onError(error) {
    if (!this.#closing) {
      this.emit("error", error);
    }
  }

  #onClose(code, buffer) {
    this.#clearKeepalive();

    const reason = buffer?.toString() || "";

    if (this.#closing) {
      logTime(`(${this.#sessionId}) Twitch WebSocket closed with code (${code})`);
    } else {
      logTime(`(${this.#sessionId}) Twitch WebSocket connection was lost, code (${code}), reason (${reason})`, 2);
    }

    this.emit("closed", code, reason);
  }


  // Keepalive

  #resetKeepalive() {
    if (!this.#keepaliveMs) return;

    this.#clearKeepalive();
    this.#keepaliveTimer = setTimeout(() => {
      logTime(`(${this.#sessionId}) Twitch WebSocket presumed dead, reconnecting...`);
      this.#clearKeepalive();
      this.emit("dead");
    }, this.#keepaliveMs - 5000);
  }

  #clearKeepalive() {
    clearTimeout(this.#keepaliveTimer);
    this.#keepaliveTimer = null;
  }


  // EventSub

  async #registerEventSub(sessionId) {
    try {
      await this.#eventSubClient.registerEventSubListeners(sessionId);
      logTime(`(${this.sessionId}) Twitch connection registered EventSub`);
    } catch (error) {
      logTime(`(${this.sessionId}) Twitch connection failed to register EventSub: ${error}`, 2);
      this.emit("error", error);
    }
  }
}
