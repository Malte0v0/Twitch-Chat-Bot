import WebSocket from "ws";

export class EarthquakeService {
    constructor(chatService, db) {
        this._chatService = chatService;
        this._db = db;

        this._websocketUrl = "wss://www.seismicportal.eu/standing_order/websocket"
        this._geoCodeApi = process.env.GEOCODE_API;
        this.connect();

        this._minMag = 6;
        this._maxDistKm = 50;
        this._maxDelayMs = 1*60*60*1000; // 1h

        this._reconnectInterval = 1000;

        this._notifiedQuakes = new Set();
        this.populateNotified();
    }

    populateNotified() {
        const rows = this._db.prepare(`
            SELECT unid FROM earthquakes
            WHERE notified = 1
        `).all();
        
        for (const { unid } of rows) {
            this._notifiedQuakes.add(unid);
        }
    }

    connect() {
        console.log("Connecting to Earthquake WebSocket");
        this._websocketClient = new WebSocket(this._websocketUrl);

        this._websocketClient.on("open", () => {
            console.log("WebSocket connection opened to " + this._websocketUrl);
            this._reconnectInterval = 1000;

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
            this._websocketClient.close(4008);
        });

        this._websocketClient.on("close", (code, reason) => {
            console.warn("Earthquake websocket was closed", code, reason);
            clearInterval(this._keepAliveInterval);
            setTimeout(() => {
                this._reconnectInterval = Math.min(this._reconnectInterval * 2, 30000);
                this.connect();
            }, this._reconnectInterval);
        });
    }

    insertToDb(info, data) {
        const payload = JSON.stringify(data);

        const insert = this._db.prepare(`
            INSERT INTO earthquakes (unid, mag, depth, lat, lon, region, data)
            VALUES (?,?,?,?,?,?,?)
        `);
        const result = insert.run(info.id, info.mag, info.depthKm, info.lat, info.lon, info.region, payload);
        if (!result.lastInsertRowid) {
            console.log("Error inserting earthquake in to db:", result, data);
        }
    }

    async handleMessage(data) {
        try {
            const action = data.action;
            if (!["create", "update"].includes(action)) {
                console.log(data);
                return;
            }

            const properties = data.data.properties;
            const info = {
                "id": data.data.id,
                "time": properties.time,
                "lat": Number(properties.lat),
                "lon": Number(properties.lon),
                "depthKm": Number(properties.depth),
                "mag": Number(properties.mag),
                "magType": properties.magtype,
                "region": properties.flynn_region
            }

            this.insertToDb(info, data);

            if (this._notifiedQuakes.has(info.id)) {
                console.log(info.id, "has already been notified");
                console.log(data);
                return;
            }
            
            if (await this.shouldSend(info.mag, info.time, info.depthKm, info.lat, info.lon)) {
                this.sendWarning(info.mag, info.magType, info.region);
                this.updateNotified(info.id);
            }
            
        } catch (error) {
            console.log(data);
            console.warn(error);
        }
    }

    updateNotified(id) {
        this._notifiedQuakes.add(id);
        this._db.prepare(`
            UPDATE earthquakes SET notified = 1 WHERE unid = ?
        `).run(id);
    }

    async shouldSend(mag, time, depthKm, lat, lon) {
        // Too long ago
        if ((Date.now() - Date.parse(time)) > this._maxDelayMs) return false; // 1 hour ago

        // Too weak
        if (mag < this._minMag) return false;

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
            `Alarm ALERT ${mag.toFixed(1)} ${magType} earthquake near ${region}`
        );
    }
    // Make this check the nearest 10 or something places and check the population
    async getDistance(lat, lon) {
        try {
            const response = await fetch(
                `http://api.geonames.org/findNearbyPlaceNameJSON?lat=${lat}&lng=${lon}&radius=300&maxRows=100&username=${this._geoCodeApi}`
            );
            const data = await response.json();

            if (!data || !data.geonames || !data.geonames[0]?.distance) {
                console.log(data);
                return;
            }

            for (const place of data.geonames) {
                if (place.population > 500) {
                    console.debug(`${place.name}, ${place.countryName}`);
                    console.debug(`Population: ${place.population} Distance: ${place.distance}km`);
                    return Number(place.distance);
                }
            }
        } catch (error) {
            console.log(error);
        }
    }
}