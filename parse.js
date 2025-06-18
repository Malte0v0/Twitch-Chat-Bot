const VALID_TIME_UNITS = [
  "d",
  "day",
  "days",
  "w",
  "week",
  "weeks",
  "m",
  "min",
  "mins",
  "minutes",
  "h",
  "hour",
  "hours",
  "month",
  "months",
  "y",
  "year",
  "years",
  "s",
  "second",
  "seconds",
];

export function parseRemindCommand(command, prefix) {
    const pattern = new RegExp(`\\${prefix}remind(?:me| (\\w+)) in (\\d+)\\s*(\\w+)\\s+(.+)`);
    const match = command.match(pattern);

    if (!match) {
        return "No match";
    }

    const targetUser = match[1] || "me";
    const timeAmount = parseInt(match[2], 10);
    const timeUnit = VALID_TIME_UNITS.includes(match[3]) ? match[3] : null;
    const message = match[4];

    if (!timeUnit) {
        return "Invalid time unit";
    }

    return {
        target: targetUser,
        time_amount: timeAmount,
        time_unit: timeUnit,
        message: message,
    };
}