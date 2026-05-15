import { HttpError, ParseError } from "../errors/errors";
import { logTime } from "../errors/log";

export class GeonamesClient {
    constructor(API) {
        this.API = API;

        this.minPopulation = 500;
    }

    nearestPlace(json) {
        try {
            if (!json || !json.geonames || !json.geonames[0]?.distance) {
                logTime(json);
                return;
            }

            for (const place of json.geonames) {
                if (place.population > this.minPopulation) {
                    console.debug(`${place.name}, ${place.countryName}`);
                    console.debug(
                        `Population: ${place.population} Distance: ${place.distance}km`,
                    );
                    return Number(place.distance);
                }
            }
        } catch (error) {
            throw new ParseError(
                `Failed to parse geoname json: ${json}`,
                error,
            );
        }
    }

    // Make this check the nearest 10 or something places and check the population
    async getDistance(lat, lon) {
        try {
            const response = await fetch(
                `http://api.geonames.org/findNearbyPlaceNameJSON?lat=${lat}&lng=${lon}&radius=300&maxRows=100&username=${this.API}`,
            );

            const data = await response.json();

            return await this.nearestPlace(data);
        } catch (error) {
            throw new HttpError(
                `Failed to get distance with geonames: ${error.message}`,
                error,
            );
        }
    }
}
