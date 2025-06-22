import SockJS from "sockjs-client";
import { getHumanTimeFromDate } from "../utils/timeUtils.js"

export class EarthquakeService {
    constructor(chatService) {
        this._chatService = chatService;

        this._emulatedWebsocket = this.start();
    }

    start() {
        let emulatedWebsocket = new SockJS("https://www.seismicportal.eu/standing_order");

        emulatedWebsocket.onopen = () => {
            console.log("Connected to earthquake websocket");
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
                const parsedJson = JSON.parse(data.data);
                
                const action = parsedJson.action;

                const properties = parsedJson.data.properties;
                const region = properties.flynn_region;
                const mag = Number(properties.mag);
                const time = new Date(properties.time);

                const localTime = getHumanTimeFromDate(time);

                if (action === "create" && mag >= 8.5) {
                await this._chatService.sendChatMessage(`Alarm 🗻 ALERT Magnitude ${mag} earthquake in ${region}`);
                }
        }
    }
}