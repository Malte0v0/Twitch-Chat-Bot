export class EarthquakeParser {
    parseData(quakeRawJSON) {
        try {
            const action = quakeRawJSON.action;
            if (!["create", "update"].includes(action)) {
                console.log(quakeRawJSON);
                return;
            }

            const properties = quakeRawJSON.data.properties;
            const quakeObject = {
                unId: quakeRawJSON.data.id,
                time: properties.time,
                lat: Number(properties.lat),
                lon: Number(properties.lon),
                depthKm: Number(properties.depth),
                mag: Number(properties.mag),
                magType: properties.magtype,
                region: properties.flynn_region,
            };

            return quakeObject;
        } catch (error) {
            console.log(quakeRawJSON);
            console.warn(error);
        }
    }
}
