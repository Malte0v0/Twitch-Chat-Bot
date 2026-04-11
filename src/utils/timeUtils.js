const VALID_TIME_UNITS_DICT = {
	days: ["d", "day", "days"],
	weeks: ["w", "week", "weeks"],
	months: ["month", "months"],
	seconds: ["s", "second", "seconds"],
	minutes: ["m", "min", "mins", "minute", "minutes"],
	hours: ["h", "hour", "hours"]
}

export function msToHuman(duration) {
  const msInSecond = 1000;
  const msInMinute = msInSecond * 60;
  const msInHour   = msInMinute * 60;
  const msInDay    = msInHour * 24;
  const msInWeek   = msInDay * 7;

  let weeks  = Math.floor(duration / msInWeek);
  duration %= msInWeek;

  let days   = Math.floor(duration / msInDay);
  duration %= msInDay;

  let hours  = Math.floor(duration / msInHour);
  duration %= msInHour;

  let minutes = Math.floor(duration / msInMinute);
  duration %= msInMinute;

  let seconds = Math.floor(duration / msInSecond);

  let parts = [];
  if (weeks)   parts.push(`${weeks}w`);
  if (days)    parts.push(`${days}d`);
  if (hours)   parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

export function splitTime(time) {
	const unitAliasMap = {};
	for (const [key, aliases] of Object.entries(VALID_TIME_UNITS_DICT)) {
		for (const alias of aliases) {
			unitAliasMap[alias.toLowerCase()] = key;
		}
	}
	// Creates an object like this
	/*
	{
		"h": "hours",
		"hour": "hours",
		"hours": "hours",
		... 
	}
	*/
	
	const splitDict = {};
	for (const key of Object.keys(VALID_TIME_UNITS_DICT)) {
		splitDict[key] = 0;
	}
	// Make an object that looks like this
	/*
	{
		seconds: 0,
		minutes: 0,
		hours: 0,
		...
		}
	*/

	const unitPattern = Object.keys(unitAliasMap).join("|");
	// unitPattern will look like ["h|hour|hours|..."]	
	
	const timeRegex = new RegExp(`(\\d+)\\s*(${unitPattern})`, "gi");
	let allMatches = time.matchAll(timeRegex);

	for (const match of allMatches) {
		const amount = Number(match[1]);
		const unit = match[2].toLowerCase();

		if (unitAliasMap[unit]) {
			splitDict[unitAliasMap[unit]] = amount;
		}
	}

	return splitDict;
}

export function convertToMs(time) {
	const timeDict = splitTime(time);
	let resultMs = 0;

	for (const unit in timeDict) {
		const amount = timeDict[unit];
		switch (unit) {
			case "seconds":
				resultMs += amount * 1000;
				break;
			case "minutes":
				resultMs += amount * 60 * 1000;
				break;
			case "hours":
				resultMs += amount * 60 * 60 * 1000;
				break;
			case "days":
				resultMs += amount * 24 * 60 * 60 * 1000;
				break;
			case "weeks":
				resultMs += amount * 7 * 24 * 60 * 60 * 1000;
				break;
			case "months":
				resultMs += amount * 30 * 24 * 60 * 60 * 1000;
				break;
			default:
				throw new Error("Unknown time unit: " + unit);
		}
	}

	return resultMs;
}

export function getHumanTimeFromDate(time) {
	const year = String(time.getFullYear()).padStart(2, "0");
	const month = String(time.getMonth() + 1).padStart(2, "0");
	const date = String(time.getDate()).padStart(2, "0");
	const hour = String(time.getHours()).padStart(2, "0");
	const minute = String(time.getMinutes()).padStart(2, "0");
	const second = String(time.getSeconds()).padStart(2, "0");
	
	return `${year}-${month}-${date} ${hour}:${minute}:${second}`;
}

export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}