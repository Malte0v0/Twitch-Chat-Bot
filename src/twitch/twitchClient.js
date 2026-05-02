import { HeartrateMonitor } from "./heartrateMonitor";

export class TwitchClient extends EventEmitter {
    constructor() {
        this.ws = null;

        this.keepaliveTimeoutSeconds = null;

        this.sessionId = null;
        this.status = null;

        this.heartrateMonitor = null;
    }

    startHeartrateMonitor() {
        this.heartrateMonitor = new HeartrateMonitor(
            this,
            this.keepaliveTimeoutSeconds,
        );
    }

    connect(url) {
        console.log("Connecting to Twitch WebSocket");
        this.ws = new WebSocket(url);

        this.ws.on("open", () => {
            console.log("Twitch WebSocket connection opened to " + url);
        });

        this.ws.on("message", (data) => {
            const messageType = data.metadata.message_type;

            if (messageType.contains("notification")) {
                this.emit("message", JSON.parse(data.toString()));
                return;
            }

            const session = data.payload.session;

            switch (messageType) {
                case "session_welcome":
                    this.sessionId = session.id;
                    this.status = session.status;
                    this.keepaliveTimeoutSeconds =
                        session.keepalive_timeout_seconds;
                    this.startHeartrateMonitor();
                case "session_keepalive":
                    this.lastKeepaliveMessage = Date.now();
                    this.emit("keepalive");
                    break;
                case "session_reconnect":
                    this.reconnect(session.reconnect_url);
                    break;
                case "revocation":
                    this.reconnect();
                    break;
            }
        });

        this.ws.on("error", (error) => {
            console.error("Twitch WebSocket error: " + error);
            this.emit("error", error);
            this.reconnect();
        });

        this.ws.on("close", (code, reason) => {
            console.warn("Twitch WebSocket was closed", code, reason);
            this.emit("close", (code, reason));
            this.disconnect();
        });
    }

    disconnect() {
        // Close if ws exists
        this.ws?.close();
    }

    reconnect(url = this.url) {
        this.disconnect();
        this.connect(url);
    }
}
