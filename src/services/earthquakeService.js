import WebSocket from "ws";
import { getHumanTimeFromDate } from "../utils/timeUtils.js"

export class EarthquakeService {
    constructor(chatService) {
        this._chatService = chatService;
        this._websocketUrl = "wss://www.seismicportal.eu/standing_order/websocket"
        this._websocketClient = this.start();
    }

    start() {
        let websocketClient = new WebSocket(this._websocketUrl);

        websocketClient.on("open", () => {
            console.log("WebSocket connection opened to " + this._websocketUrl);
        });

        websocketClient.on("message", async (data) => {
            try {
                await this.handleMessage(JSON.parse(data.toString()));
            } catch (error) {
                console.error("Error in earthquake message handler:", error);
            }
        });

        websocketClient.on("error", (error) => {
            console.error(error);
        });

        websocketClient.on("close", (code, reason) => {
            console.warn("Earthquake websocket was closed", code, reason);
        });

        websocketClient.on("ping", () => {
            websocketClient.pong();
        });

        return websocketClient;
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