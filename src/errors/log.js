const LEVEL = {
    log: 1,
    warn: 2,
    error: 3,
};

export function logTime(message, level = null) {
    if (!level) level = LEVEL.log;

    const currentDate = new Date().toLocaleString("sv-SE", {
        hour12: false,
        timeZoneName: "shortOffset",
    });

    const logMessage = `${currentDate} | ${message}`;

    switch (level) {
        case LEVEL.log:
            console.log(logMessage);
            break;
        case LEVEL.warn:
            console.warn(logMessage);
            break;
        case LEVEL.error:
            console.error(logMessage);
            break;
    }
}
