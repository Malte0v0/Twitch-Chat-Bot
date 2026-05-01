export class GeonamesClient {
    constructor(API) {
        this.API = API;

        this.minPopulation = 500;
    }

    nearestPlace(json) {
        if (!json || !json.geonames || !json.geonames[0]?.distance) {
            console.log(json);
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
    }

    // Make this check the nearest 10 or something places and check the population
    getDistance(lat, lon) {
        return fetch(
            `http://api.geonames.org/findNearbyPlaceNameJSON?lat=${lat}&lng=${lon}&radius=300&maxRows=100&username=${this.API}`,
        )
            .then((response) => response.json())
            .then((json) => {
                return this.nearestPlace(json);
            })
            .catch((error) => console.log(error));
    }
}
