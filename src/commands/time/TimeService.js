export class TimeService {
  constructor() {
    this._options = {
      timeZone: "",
      timeZoneName: "short",
      hour: "2-digit",
      minute: "2-digit",
    };
  }

  #getTimeString(timezone) {
    this._options.timeZone = timezone;
    return new Date().toLocaleTimeString("en-US", this._options);
  }

  timeCommand() {
    return [
      `EU ${this.#getTimeString("Europe/Stockholm")}`,
      `Barry63 ${this.#getTimeString("Europe/London")}`,
      `TrumpSalute ${this.#getTimeString("America/New_York")}`,
    ]
  }
}
