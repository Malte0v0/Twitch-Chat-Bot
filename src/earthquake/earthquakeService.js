import { EarthquakeClient } from "./earthquakeClient.js";
import { EarthquakeParser } from "./earthquakeParser.js";
import { EarthquakeRepository } from "./earthquakeRepository.js";
import { GeonamesClient } from "./geonamesClient.js";

export class EarthquakeService {
    constructor(chatService, database) {
        this.chatService = chatService;
        this.database = database;

        this.url = "wss://www.seismicportal.eu/standing_order/websocket";
        this.geoCodeApi = process.env.GEOCODE_API;

        this.minMag = 6;
        this.maxDistKm = 50;
        this.maxDelayMs = 1 * 60 * 60 * 1000; // 1h

        this.earthquakeClient = new EarthquakeClient(this.url);
        this.earthquakeParser = new EarthquakeParser();
        this.earthquakeRepository = new EarthquakeRepository(this.database);
        this.geonamesClient = new GeonamesClient(this.geoCodeApi);
    }

    start() {
        this.earthquakeClient.on("quake", async (quakeRawJSON) => {
            try {
                this.onQuake(quakeRawJSON);
            } catch (error) {
                console.error("Parse or handle error:", error);
                console.error("Raw message:", quakeRawJSON);
            }
        });

        this.earthquakeClient.connect();
    }

    onQuake(quakeRawJSON) {
        const quakeObject = this.earthquakeParser.parseData(quakeRawJSON);
        if (!quakeObject) return;

        this.earthquakeRepository.insert(quakeRawJSON, quakeObject);

        if (this.earthquakeRepository.existsInCache(quakeObject.unId)) {
            return;
        }

        if (this.shouldSend(quakeObject)) {
            this.sendWarning(quakeObject).catch((error) => console.log(error));
        }
    }

    shouldSend(quakeObject) {
        // Too long ago
        if (Date.now() - Date.parse(quakeObject.time) > this.maxDelayMs)
            return false; // 1 hour ago

        // Too weak
        if (quakeObject.mag < this.minMag) return false;

        console.debug(
            `Mag: ${quakeObject.mag}, Depth: ${quakeObject.depthKm}, Lat: ${quakeObject.lat}, Lon: ${quakeObject.lon}`,
        );

        // Very large
        if (quakeObject.mag >= 8.0) return true;

        // Shallow and large
        if (quakeObject.mag >= 7.0 && quakeObject.depthKm <= 70) return true;

        // Close to population
        const distKm =
            this.geonamesClient.getDistance(quakeObject.lat, quakeObject.lon) ||
            300;
        const scale = Math.exp((quakeObject.mag - this.minMag) / 1.8);
        const scaledMaxDistKm = scale * this.maxDistKm;

        if (distKm <= scaledMaxDistKm) {
            return true;
        }

        return false;
    }

    async sendWarning(quakeObject) {
        await this.chatService.sendChatMessage(
            `Alarm ALERT ${quakeObject.mag.toFixed(1)} ${quakeObject.magType} earthquake near ${quakeObject.region}`,
        );
    }
}
