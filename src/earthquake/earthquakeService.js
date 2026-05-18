import { BotError, DatabaseError } from "../errors/errors.js";
import { logTime } from "../errors/log.js";
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
                await this.onQuake(quakeRawJSON);
            } catch (error) {
                logTime(error, 3);
                logTime(
                    `Raw earthquake message: ${JSON.stringify(quakeRawJSON)}`,
                );
            }
        });

        this.earthquakeClient.on("error", (error) => {
            logTime(`Earthquake client error: (${error})`, 3);
        });

        this.earthquakeClient.on("close", (code, reason) => {
            logTime(
                `Earthquake client closed (${code}, ${reason}), awaiting reconnect...`,
                2,
            );
        });

        this.earthquakeClient.connect();
        this.earthquakeRepository.populateCache();
    }

    async onQuake(quakeRawJSON) {
        const action = quakeRawJSON.action;
        if (!["create", "update"].includes(action)) {
            console.log(quakeRawJSON);
            return;
        }

        const quakeObject = this.earthquakeParser.parseData(quakeRawJSON);

        const inserted = this.earthquakeRepository.insert(
            quakeRawJSON,
            quakeObject,
        );
        if (inserted === null) {
            logTime(
                `Earthquake with UNID (${quakeObject.unId}) already exists in database`,
                2,
            );
            return;
        }

        if (this.earthquakeRepository.existsInCache(quakeObject.unId)) {
            return;
        }

        if (await this.shouldSend(quakeObject)) {
            await this.sendWarning(quakeObject);
        }
    }

    async shouldSend(quakeObject) {
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
            (await this.geonamesClient.getDistance(
                quakeObject.lat,
                quakeObject.lon,
            )) || 300;
        const scale = Math.exp((quakeObject.mag - this.minMag) / 1.8);
        const scaledMaxDistKm = scale * this.maxDistKm;

        if (distKm <= scaledMaxDistKm) {
            return true;
        }

        return false;
    }

    async sendWarning(quakeObject) {
        try {
            await this.chatService.sendChatMessage(
                `Alarm ALERT ${quakeObject.mag.toFixed(1)} ${quakeObject.magType} earthquake near ${quakeObject.region}`,
            );
            this.earthquakeRepository.setNotified(quakeObject.unId);
        } catch (error) {
            if (error instanceof DatabaseError) {
                logTime(
                    `Earthquake warning sent but failed to mark as notified in database (${quakeObject.unId}): ${error.cause}`,
                    3,
                );
            } else {
                throw new BotError(
                    `Failed to send warning for earthquake with UNID (${quakeObject.unId})`,
                    error,
                );
            }
        }
    }
}
