import WebSocket from "ws";
import { getHumanTimeFromDate } from "../utils/timeUtils.js"

export class EarthquakeService {
    constructor(chatService) {
        this._chatService = chatService;
        this._websocketUrl = "wss://www.seismicportal.eu/standing_order/websocket"
        this.start();
    }

    start() {
        this._websocketClient = new WebSocket(this._websocketUrl);

        this._websocketClient.on("open", () => {
            console.log("WebSocket connection opened to " + this._websocketUrl);

            this._keepAliveInterval = setInterval(() => {
                if (this._websocketClient.readyState === WebSocket.OPEN) {
                    this._websocketClient.ping();
                }
            }, 15000);
        });

        this._websocketClient.on("message", async (data) => {
            const raw = data.toString();
            try {
                await this.handleMessage(JSON.parse(raw));
            } catch (error) {
                console.error("Parse or handle error:", error);
                console.error("Raw message:", raw);
            }
        });

        this._websocketClient.on("error", (error) => {
            console.error(error);
        });

        this._websocketClient.on("close", (code, reason) => {
            console.warn("Earthquake websocket was closed", code, reason);
            clearInterval(this._keepAliveInterval);
            setTimeout(() => {
                this.start();
            }, 5000);
        });
    }

    async handleMessage(data) {
        try {
            const action = data.action;
            const properties = data.data.properties;
            const mag = Number(properties.mag);
            const region = properties.flynn_region;
            const time = new Date(properties.time);

            if (action === "create" && mag >= 8) {
                const localTime = getHumanTimeFromDate(time);
                await this._chatService.sendChatMessage(`Alarm 🗻 ALERT Magnitude ${mag} earthquake in ${region}`);
            }
        } catch (error) {
            console.log(data);
            console.warn(error);
        }
    }
}