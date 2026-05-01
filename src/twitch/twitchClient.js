export class TwitchClient extends EventEmitter {
    constructor(url) {
        super();

        this.url = url;
    }

    connect() {
        console.log("Connecting to Twitch WebSocket with:", this.url);
        const client = new WebSocket(this.url);
        const connectTimeout = setTimeout(() => {
            if (client.readyState === WebSocket.CONNECTING) {
                console.warn("Connection timeout");
                client.close();
            }
        }, 10000);

        this._mainWebSocketClient = client;

        client.on("open", () => {
            console.log(
                `Twitch WebSocket ${this._websocketSessionID || "new"} connection opened, url: ${this.url}`,
            );
            clearInterval(connectTimeout);
            this._reconnecting = false;
            this.resetReconnectInterval();
        });

        client.on("message", async (data) => {
            try {
                await this.handleMessages(JSON.parse(data.toString()));
            } catch (error) {
                console.error(
                    "Error handling Twitch websocket message:",
                    error,
                );
            }
        });

        client.on("error", (error) => {
            console.warn(
                `Twitch WebSocket ${this._websocketSessionID || "unknown"} error: ${error}`,
            );
            client.close(4008);
        });

        client.on("close", (code, reason) => {
            console.log(
                `Twitch WebSocket ${this._websocketSessionID || "unknown"} closed: ${code} ${reason.toString()}`,
            );

            if (client === this._mainWebSocketClient && code !== 1000) {
                this._reconnecting = false;
                this._reconnectInterval = Math.min(
                    this._reconnectInterval * 2,
                    60000,
                );
                console.warn(
                    `Trying to reconnect in ${this._reconnectInterval / 1000}s...`,
                );
                setTimeout(() => {
                    this.reconnect();
                }, this._reconnectInterval);
            }
        });
    }
}
