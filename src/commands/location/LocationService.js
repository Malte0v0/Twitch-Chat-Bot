import {
  formatLocationHasBeenSetResponse,
  noLocationProvided,
} from "./LocationFormatter.js";

export class LocationService {
  constructor(locationRepository) {
    this.locationRepository = locationRepository;
  }

  setLocation(location, userId) {
    if (!location) return noLocationProvided();

    this.locationRepository.saveLocation(userId, location);

    return formatLocationHasBeenSetResponse(location);
  }
}
