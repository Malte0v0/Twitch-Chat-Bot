import WebSocket from "ws";

export class EarthquakeService {
    constructor(chatService) {
        this._chatService = chatService;
        this._websocketUrl = "wss://www.seismicportal.eu/standing_order/websocket"
        this._geoCodeApi = process.env.GEOCODE_API;
        this.start();

        this._minMag = 5.5;
        this._maxDistKm = 50; // km
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
            if (action !== "create") {
                return;
            }

            const properties = data.data.properties;
            const lat = Number(properties.lat);
            const lon = Number(properties.lon);
            const depthKm = Number(properties.depth);
            const mag = Number(properties.mag);
            const magType = properties.magtype
            const region = properties.flynn_region;
            const time = new Date(properties.time);
            
            if (await this.shouldSend(mag, depthKm, lat, lon)) {
                this.sendWarning(mag, magType, region);
            }

        } catch (error) {
            console.log(data);
            console.warn(error);
        }
    }

    async shouldSend(mag, depthKm, lat, lon) {
        // Too weak
        if (mag < this._minMag) return false;

        console.debug(`Quake is more than magnitude ${this._minMag.toString()}`);
        console.debug(`Mag: ${mag}, Depth: ${depthKm}, Lat: ${lat}, Lon: ${lon}`);
        
        // Very large
        if (mag >= 8.0) return true;

        // Shallow and large
        if (mag >= 7.0 && depthKm <= 70) return true;

        // Close to population
        const distKm = await this.getDistance(lat, lon) || 300;
        const scale = Math.exp((mag - this._minMag) / 1.8);
        const scaledMaxDistKm = scale * this._maxDistKm;

        if (distKm <= scaledMaxDistKm) {
            return true;   
        }

        return false;
    }

    async sendWarning(mag, magType, region) {
        await this._chatService.sendChatMessage(
            `Alarm 🗻 ALERT Magnitude ${mag.toFixed(1)} ${magType} quake near ${region}`
        );
    }

    async getDistance(lat, lon) {
        try {
            const response = await fetch(
                `http://api.geonames.org/findNearbyPlaceNameJSON?lat=${lat}&lng=${lon}&radius=300&maxRows=1&username=${this._geoCodeApi}`
            );
            const data = await response.json();

            if (!data || !data.geonames || !data.geonames[0].distance) {
                console.log(data);
                return null;
            }

            const geoNames = data.geonames;
            const distance = Number(geoNames[0].distance);

            return distance;

        } catch (error) {
            console.log(error);
        }
    }
}