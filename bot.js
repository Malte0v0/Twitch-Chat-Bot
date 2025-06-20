import WebSocket from "ws";
import Database from "better-sqlite3";
import fs from "fs";
import "dotenv/config";
import { URLSearchParams } from "url";

const VALID_TIME_UNITS_DICT = {
    days: ["d", "day", "days"],
    weeks: ["w", "week", "weeks"],
    months: ["month", "months"],
    seconds: ["s", "second", "seconds"],
    minutes: ["m", "min", "mins", "minute", "minutes"],
    hours: ["h", "hour", "hours"]
}

const db = new Database("database.db", {timeout: 1000});

const BOT_USER_ID = "1225554271"; // This is the User ID of the chat bot
let OAUTH_TOKEN = process.env.OAUTH_TOKEN;
let REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const WEATHER_API = process.env.WEATHER_API;

// p5vrq 1251520948
// 527762906
const CHAT_CHANNEL_USER_ID = "1251520948"; // This is the User ID of the channel that the bot will join and listen to chat messages of
const COMMAND_PREFIX = "$"

const EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";

let websocketSessionID;
let websocketClient;

// Start executing the bot from here
(async () => {
	// Verify that the authentication is valid
	await getAuth();

	const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;
	setInterval(() => {
		refreshOAuthToken().catch(console.error);
	}, REFRESH_INTERVAL_MS);

    initializeDatabase();
    startReminderScheduler();

	// Start WebSocket client and register handlers
	websocketClient = startWebSocketClient();
})();

// WebSocket will persist the application loop until you exit the program forcefully

async function getAuth() {
	// https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token
	let response = await fetch("https://id.twitch.tv/oauth2/validate", {
		method: "GET",
		headers: {
			"Authorization": "OAuth " + OAUTH_TOKEN
		}
	});

	if (response.status != 200) {
		console.log("Token invalid. Refreshing...")
		await refreshOAuthToken();

	} else {
		console.log("Validated token.");
	}
}

function updateEnvFile(newOAuthToken, newRefreshToken) {
	const envData =
		`OAUTH_TOKEN=${newOAuthToken}
CLIENT_ID=${CLIENT_ID}
CLIENT_SECRET=${CLIENT_SECRET}
REFRESH_TOKEN=${newRefreshToken}
WEATHER_API=${WEATHER_API}`;
	fs.writeFileSync(".env", envData, "utf-8");
}

async function refreshOAuthToken() {
	const url = "https://id.twitch.tv/oauth2/token";
	const params = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: REFRESH_TOKEN,
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET
	})

	try {
		let response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: params
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("Error refreshing token:", errorData);
			return null;
		}

		let data = await response.json();
		const {access_token, refresh_token, expires_in} = data;

		// save to .env
		updateEnvFile(access_token, refresh_token);
	
		OAUTH_TOKEN = access_token;
		REFRESH_TOKEN = refresh_token;

		return expires_in;
	} catch (error) {
		console.error("Error occurred trying to refresh token:", error);
		return null;
	}
}

function startWebSocketClient(websocketUrl=EVENTSUB_WEBSOCKET_URL) {
	let websocketClient = new WebSocket(websocketUrl);

	websocketClient.on("error", console.error);

	websocketClient.on("open", () => {
		console.log("WebSocket connection opened to " + websocketUrl);
	});

	websocketClient.on("message", (data) => {
		handleWebSocketMessage(JSON.parse(data.toString()));
	});

	return websocketClient;
}

function msToHuman(duration) {
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

function startReminderScheduler() {
	setInterval(() => {
		(async () => {
			const now = Date.now();
	
			// Fetch due, undelivered reminders
			const reminders = db.prepare(`
				SELECT * FROM reminders
				WHERE delivered = 0 AND trigger_time <= ?
			`).all(now);
	
			// Send each reminder and mark as delivered
			for (const reminder of reminders) {
				let timeSinceSet = msToHuman(now - reminder.created_at)

				if (reminder.sender === reminder.target) {
					await sendChatMessage(`${reminder.target}, reminder from yourself (${timeSinceSet} ago): ${reminder.message}`);
				} else {
					await sendChatMessage(`${reminder.target}, reminder from ${reminder.sender} (${timeSinceSet} ago): ${reminder.message}`);
				}
	
				db.prepare(`
					UPDATE reminders SET delivered = 1 WHERE id = ?
				`).run(reminder.id);
			}
		})();
	}, 10_000);
}

function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        target TEXT NOT NULL,
        message TEXT NOT NULL,
        trigger_time INTEGER NOT NULL,
        delivered INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
        )        
    `);
	
    db.exec(`
        CREATE TABLE IF NOT EXISTS chatter_status (
        user_id INTEGER PRIMARY KEY,
        user_name TEXT NOT NULL,
        time INTEGER NOT NULL,
		message TEXT NOT NULL,
        is_afk INTEGER NOT NULL DEFAULT 0,
        is_asleep INTEGER NOT NULL DEFAULT 0
        )        
    `);
}

function sanitizeInput(input) {
  return input.replace(/[\x00-\x1F\x7F]/g, '');
}

function splitTime(time) {
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

function convertToMs(time) {
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

function parseRemindCommand(messageText) {
	const pattern = new RegExp(`\\${COMMAND_PREFIX}remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)\\s+(.+)`);
	const match = messageText.match(pattern);

	if (!match) {
		return "No match";
	}
	const targetUser = match[1] || "me";
	const time = match[2];
	const message = match[3];

	return {
		target: targetUser,
		time: time,
		message: message,
	}
}

function remindCommand(messageText, data) {
	let reminderDict = parseRemindCommand(messageText)
	if (reminderDict === "No match") {
		return;
	}
	// console.log(reminderDict["target"])
	let sender = data.payload.event.chatter_user_login.toLowerCase()
	let target = reminderDict["target"] === "me" ? data.payload.event.chatter_user_login.trim() : reminderDict["target"].toLowerCase()
	const currentTime = Date.now();
	const timeToTarget = convertToMs(reminderDict["time"])

	if (reminderDict["message"].length > 400) {
		return;
	}

	const insert = db.prepare(`
		INSERT INTO reminders (sender, target, message, trigger_time, created_at)
		VALUES (?,?,?,?,?)
	`);
	insert.run(
		sender,
		target,
		reminderDict["message"],
		currentTime + timeToTarget,
		currentTime
	)

	// Let the user know that a reminder has been set
	const timeUntil = msToHuman(timeToTarget)
	if (sender === target){
		sendChatMessage(`${sender}, I will remind you in ${timeUntil}`)
	} else {
		sendChatMessage(`${sender}, I will remind ${target} in ${timeUntil}`)
	}
}

function getWeatherEmoji(weatherJson) {
	if (!weatherJson || !weatherJson.weather || !weatherJson.weather[0]) {
		return "❓";
	}

	const main = weatherJson.weather[0].main.toLowerCase();
	const id = weatherJson.weather[0].id;

	switch (main) {
		case "clear":
			return "☀️";
		case "clouds":
			if (id === 801) return "🌤️";
			if (id === 802) return "⛅";
			if (id >= 803) return "☁️";
			return "🌥️";
		case "rain":
			return "🌧️";
		case "drizzle":
			return "🌦️";
		case "thunderstorm":
			return "⛈️";
		case "snow":
			return "❄️";
		case "mist":
		case "fog":
		case "haze":
		case "smoke":
		case "dust":
		case "sand":
		case "ash":
			return "🌫️";
		case "squall":
		case "tornado":
			return "🌪️";
		default:
			return "❓";
	}
}

async function getWeather(cityName) {
	try {
		const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${WEATHER_API}&units=metric`);
		if (!response.ok) throw new Error("Network error:" + response.statusText);
		const data = await response.json()

		return data
	} catch (error) {
		console.error(error)
	}
}

async function weatherCommand(messageText, data) {
	const pattern = new RegExp(`\\${COMMAND_PREFIX}weather (.+)`);
	const match = messageText.match(pattern);

	if (!match) throw new Error("Weather command, no match in message");

	const cityName = match[1];
	const sender = data.payload.event.chatter_user_login.toLowerCase();
	const weatherJson = await getWeather(cityName);

	const weather = weatherJson["main"];
	const temp = weather["temp"];
	const feelsLike = weather["feels_like"];
	const humidity = weather["humidity"];

	const clouds = weatherJson["clouds"]["all"]; // implement cloud emoji getting
	const windSpeed = weatherJson["wind"]["speed"]
	const city = weatherJson["name"];
	const country = weatherJson["sys"]["country"];
	const emoji = getWeatherEmoji(weatherJson);
	
	sendChatMessage(`${sender}, ${city}, ${country} (now): ${emoji} ${temp}°C, feels like ${feelsLike}°C. Cloud cover: ${clouds}%. Wind speed: ${windSpeed} m/s. Humidity: ${humidity}%`)

}

function getAfkOrAsleepUsernames() {
	const query = db.prepare("SELECT user_name FROM chatter_status WHERE is_afk = 1 OR is_asleep = 1");
	const rows = query.all()

	return rows.map(row => row.user_name)
}

function checkChatterStatusByName(userName) {
	const status = db.prepare(`
	SELECT user_name, time, message, is_afk, is_asleep FROM chatter_status
	WHERE user_name = ?
	`).get(userName);

	if (status) {
		const {user_name: user_name, time: time, message: message, is_afk: isAfk, is_asleep: isAsleep} = status;
		return {user_name, time, message, isAfk, isAsleep};
	} else {
		return null;
	}
}

function checkChatterStatus(userId) {
	const status = db.prepare(`
	SELECT user_name, time, message, is_afk, is_asleep FROM chatter_status
	WHERE user_id = ?
	`).get(userId);

	if (status) {
		const {user_name: user_name, time: time, message: message, is_afk: isAfk, is_asleep: isAsleep} = status;
		return {user_name, time, message, isAfk, isAsleep};
	} else {
		return null;
	}
}

function toggleAfkStatus(userId, message = "") {
	db.prepare(`
		UPDATE chatter_status SET is_afk = NOT is_afk, time = ?, message = ? WHERE user_id = ?
	`).run(Date.now(), message, userId);
}

function toggleAsleepStatus(userId, message = "") {
	db.prepare(`
		UPDATE chatter_status SET is_asleep = NOT is_asleep, time = ?, message = ? WHERE user_id = ?
	`).run(Date.now(), message, userId);
}

function insertChatterStatus(data) {
	const userId = data.payload.event.chatter_user_id
	const userLogin = data.payload.event.chatter_user_login
	const currentTime = Date.now()

	db.prepare(`
	INSERT OR IGNORE INTO chatter_status (user_id, user_name, time, message, is_afk, is_asleep)
	VALUES (?,?,?,?,?,?)
	`).run(userId, userLogin, currentTime, "", 0, 0);
}

function setUserStatus(messageText, data, statusType) {
	const userId = data.payload.event.chatter_user_id
	const userLogin = data.payload.event.chatter_user_login
	
	let status = checkChatterStatus(userId);
	if (!status) {
		insertChatterStatus(data);
		status = checkChatterStatus(userId);
	}
	
	// Get the afk or sleep message and format it in to a variable called message
	const pattern = new RegExp(`\\${COMMAND_PREFIX}${statusType} (.*)`)
	const match = messageText.match(pattern);
	let message = "";
	if (match && match[1]) {
		message = ": " + match[1].trim();
	}

	if (statusType === "afk") {
		toggleAfkStatus(userId, message);
		sendChatMessage(`${userLogin} is now AFK${message}`);
	} else if (statusType === "sleep") {
		toggleAsleepStatus(userId, message);
		sendChatMessage(`${userLogin} is now sleeping${message}`);
	}
}

function getHumanTimeFromDate(time) {
	const year = String(time.getFullYear()).padStart(2, "0");
	const month = String(time.getMonth()).padStart(2, "0");
	const date = String(time.getDate()).padStart(2, "0");
	const hour = String(time.getHours()).padStart(2, "0");
	const minute = String(time.getMinutes()).padStart(2, "0");
	const second = String(time.getSeconds()).padStart(2, "0");
	
	return `${year}-${month}-${date} ${hour}:${minute}:${second}`;
}

function handleWebSocketMessage(data) {
	const time = new Date(data.metadata.message_timestamp);
	const messageTime = getHumanTimeFromDate(time);

	switch (data.metadata.message_type) {
		case "session_welcome": // First message you get from the WebSocket server when connecting
			websocketSessionID = data.payload.session.id; // Register the Session ID it gives us

			// Listen to EventSub, which joins the chatroom from your bot's account
			registerEventSubListeners();
			break;
		case "session_reconnect":
			const newWebsocketUrl = data.payload.session.reconnect_url;

			// Close the old websocketClient
			websocketClient.close();
			// Start a new one
			websocketClient = startWebSocketClient(newWebsocketUrl);
			break;
		case "notification": // An EventSub notification has occurred, such as channel.chat.message
			switch (data.metadata.subscription_type) {
				case "channel.chat.message":
					// First, print the message to the program's console.
					console.log(`MSG ${messageTime} #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);
					// Sanitize the message text
					if (data?.payload?.event?.message?.text) {
						data.payload.event.message.text = sanitizeInput(data.payload.event.message.text);
					}
					let messageText = data.payload.event.message.text.trim()

					// AFK AND SLEEPING START
					try {
						const userId = data.payload.event.chatter_user_id;
						const userLogin = data.payload.event.chatter_user_login;
						const status = checkChatterStatus(userId);
						
						const asleepOrAfkUsers = getAfkOrAsleepUsernames();
						for (const user of asleepOrAfkUsers) {
							if (messageText.toLowerCase().startsWith(`@${user}`)) {
								const asleepOrAfkUserStatus = checkChatterStatusByName(user);
								if (asleepOrAfkUserStatus.isAfk) {
									sendChatMessage(`${userLogin}, ${user} is currently AFK${asleepOrAfkUserStatus.message}`)
								} else if (asleepOrAfkUserStatus.isAsleep) {
									sendChatMessage(`${userLogin}, ${user} is currently sleeping${asleepOrAfkUserStatus.message}`)
								}
							}
						}

						if (status && (status.isAfk || status.isAsleep)) {
							const timeSince = msToHuman(Date.now() - status.time); 
							
							if (status.isAfk) {
								toggleAfkStatus(userId);
								sendChatMessage(`${userLogin} is no longer AFK${status.message} (${timeSince})`);
							} else if (status.isAsleep) {
								toggleAsleepStatus(userId);
								sendChatMessage(`${userLogin} is no longer sleeping${status.message} (${timeSince})`);
							}
							break;
						}
					} catch (error) {
						console.error(error);
						break;
					}
					// AFK AND SLEEPING END
					
					// COMMANDS START
					try {
                        if (messageText.toLowerCase().startsWith(COMMAND_PREFIX)) {
                            // The message is a command
                            if (messageText.startsWith(COMMAND_PREFIX + "remind")) {
								remindCommand(messageText, data);
                            } else if (messageText.startsWith(COMMAND_PREFIX + "weather")) {
								weatherCommand(messageText, data).catch(error => {
									console.error("Weather command failed:", error);
								})
							} else if (messageText.startsWith(COMMAND_PREFIX + "afk")) {
								setUserStatus(messageText, data, "afk");
							} else if (messageText.startsWith(COMMAND_PREFIX + "sleep")) {
								setUserStatus(messageText, data, "sleep");
							}
                        }
                    } catch (error) {
						sendChatMessage('Invalid format. The correct format is: "$remindme in [time] [message]" or "$remind [username] in [time] [message]"')
						console.error(error);
					}
					// COMMANDS END
					break;
			}
			break;
	}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendChatMessage(chatMessage) {
	let response = await fetch('https://api.twitch.tv/helix/chat/messages', {
		method: "POST",
		headers: {
			"Authorization": "Bearer " + OAUTH_TOKEN,
			"Client-Id": CLIENT_ID,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			broadcaster_id: CHAT_CHANNEL_USER_ID,
			sender_id: BOT_USER_ID,
			message: chatMessage
		})
	});

	if (response.status != 200) {
		let data = await response.json();
		console.error("Failed to send chat message");
		console.error(data);
	} 

	if (response.status === 401 || response.status === 403) {
		await refreshOAuthToken();
		await sendChatMessage(chatMessage); // Retry
    }

	if (response.status === 429) {
		console.log("Rate limit reached, retrying in 2 seconds...");
		await sleep(2000);
		sendChatMessage(chatMessage);
	}
}

async function registerEventSubListeners() {
	// Register channel.chat.message
	let response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
		method: "POST",
		headers: {
			"Authorization": "Bearer " + OAUTH_TOKEN,
			"Client-Id": CLIENT_ID,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			type: "channel.chat.message",
			version: "1",
			condition: {
				broadcaster_user_id: CHAT_CHANNEL_USER_ID,
				user_id: BOT_USER_ID
			},
			transport: {
				method: "websocket",
				session_id: websocketSessionID
			}
		})
	});

	if (response.status != 202) {
		let data = await response.json();
		console.error("Failed to subscribe to channel.chat.message. API call returned status code " + response.status);
		console.error(data);
		process.exit(1);
	} else {
		const data = await response.json();
		console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
	}
}
