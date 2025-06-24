import SockJS from "sockjs-client";
import { getHumanTimeFromDate } from "../utils/timeUtils.js"

export class EarthquakeService {
    constructor(chatService) {
        this._chatService = chatService;
        this._websocketUrl = "https://www.seismicportal.eu/standing_order"
        this._emulatedWebsocket = this.start();
    }

    start() {
        let emulatedWebsocket = new SockJS(this._websocketUrl);

        emulatedWebsocket.onopen = () => {
            console.log("WebSocket connection opened to " + this._websocketUrl);
        }

        emulatedWebsocket.onmessage = async (data) => {
            try {
                await this.handleMessage(data);
            } catch (error) {
                console.error("Error in earthquake message handler:", error);
            }
        }

        emulatedWebsocket.onerror = (error) => {
            console.error(error);
        }

        emulatedWebsocket.onclose = () => {
            console.warn("Earthquake websocket was closed");
        }

        return emulatedWebsocket;
    }

    async handleMessage(data) {
        switch (data.type) {
            case "message":
                try {
                    const parsedJson = JSON.parse(data.data);
                    const action = parsedJson.action;
                    const properties = parsedJson.data.properties;
                    const mag = Number(properties.mag);
                    
                    if (action === "create" && mag >= 8) {
                        const region = properties.flynn_region;
                        const time = new Date(properties.time);
        
                        const localTime = getHumanTimeFromDate(time);
                        await this._chatService.sendChatMessage(`Alarm 🗻 ALERT Magnitude ${mag} earthquake in ${region}`);
                    }
                } catch (error) {
                    console.log(data);
                    console.error(error);
                }
        }
    }
}