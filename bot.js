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

const db = new Database("database.db");

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

var websocketSessionID;

// Start executing the bot from here
(async () => {
	// Verify that the authentication is valid
	await getAuth();

	const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;
	setInterval(() => {
		refreshOAuthToken().catch(console.error);
	}, REFRESH_INTERVAL_MS);

    initializeDatabase();
    startReminderScheduler();

	// Start WebSocket client and register handlers
	const websocketClient = startWebSocketClient();
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
		console.log(".env file was updated")
	
		OAUTH_TOKEN = access_token;
		REFRESH_TOKEN = refresh_token;

		return expires_in;
	} catch (error) {
		console.error("Error occurred trying to refresh token:", error);
		return null;
	}
}

function startWebSocketClient() {
	let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

	websocketClient.on("error", console.error);

	websocketClient.on("open", () => {
		console.log("WebSocket connection opened to " + EVENTSUB_WEBSOCKET_URL);
	});

	websocketClient.on("message", (data) => {
		handleWebSocketMessage(JSON.parse(data.toString()));
	});

	return websocketClient;
}

function msToTime(duration) {
	let seconds = Math.floor((duration / 1000) % 60);
	let minutes = Math.floor((duration / (1000 * 60)) % 60);
	let hours = Math.floor(duration / (1000 * 60 * 60));

	let parts = []
	if (hours) parts.push(`${hours}h`);
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
			// console.log(reminders)
			for (const reminder of reminders) {
				let timeSinceSet = msToTime(now - reminder.created_at)

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
	}, 10_000); // every 10 seconds
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
}

function convertToMs(reminderDict) {
    let timeUnit = returnTimeUnit(reminderDict["time_unit"]);
    let timeAmount = reminderDict["time_amount"];
    let resultMs;

    switch (timeUnit) {
        case "seconds":
            resultMs = timeAmount * 1000;
            break;
        case "minutes":
            resultMs = timeAmount * 60 * 1000;
            break;
        case "hours":
            resultMs = timeAmount * 60 * 60 * 1000;
            break;
        case "days":
            resultMs = timeAmount * 24 * 60 * 60 * 1000;
            break;
        case "weeks":
            resultMs = timeAmount * 7 * 24 * 60 * 60 * 1000;
            break;
        case "months":
            resultMs = timeAmount * 30.417 * 24 * 60 * 60 * 1000;
            break;
        default:
            throw new Error("Unknown time unit: " + timeUnit);
    }

    return resultMs;
}

function sanitizeInput(input) { 
	return input.replace(/[^a-zA-Z0-9@!$ ]/g, '');
}

function returnTimeUnit(time) {
    for (let unit in VALID_TIME_UNITS_DICT) {
        for (let unitTag of VALID_TIME_UNITS_DICT[unit]) {
            if (time === unitTag) {
                return unit;
            }
        }
    }
    return null;
}

function parseRemindCommand(messageText) {
	const pattern = new RegExp(`\\${COMMAND_PREFIX}remind(?:me| (\\w+)) in (\\d+)\\s*(\\w+)\\s+(.+)`);
	const match = messageText.match(pattern);

	if (!match) {
		return "No match";
	}

	const targetUser = match[1] || "me";
	const timeAmount = parseInt(match[2], 10);
	const timeUnit = returnTimeUnit(match[3]);
	const message = match[4];

	if (!timeUnit) {
		return "Invalid time unit";
	}

	return {
		target: targetUser,
		time_amount: timeAmount,
		time_unit: timeUnit,
		message: message,
	}
}

function remindCommand(messageText, data) {
	let reminderDict = parseRemindCommand(messageText)
	if (reminderDict === "Invalid time unit") {
		return
	}

	let sender = data.payload.event.chatter_user_login.toLowerCase()
	let target = reminderDict["target"] === "me" ? data.payload.event.chatter_user_login.trim() : reminderDict["target"].toLowerCase()

	const insert = db.prepare(`
		INSERT INTO reminders (sender, target, message, trigger_time, created_at)
		VALUES (?,?,?,?,?)
	`);

	insert.run(
		sender,
		target,
		reminderDict["message"],
		Date.now() + convertToMs(reminderDict),
		Date.now()
	)

	// Let the user know
	let timeUnit = reminderDict["time_amount"] !== 1 ? reminderDict["time_unit"] : reminderDict["time_unit"].slice(0, -1);
	if (sender === target){
		sendChatMessage(`${sender}, I will remind you in ${reminderDict["time_amount"]} ${timeUnit}`)
	} else {
		sendChatMessage(`${sender}, I will remind ${target} in ${reminderDict["time_amount"]} ${timeUnit}`)
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
	const pattern = new RegExp(`\\${COMMAND_PREFIX}weather (\\w+)`);
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

function handleWebSocketMessage(data) {
	switch (data.metadata.message_type) {
		case "session_welcome": // First message you get from the WebSocket server when connecting
			websocketSessionID = data.payload.session.id; // Register the Session ID it gives us

			// Listen to EventSub, which joins the chatroom from your bot's account
			registerEventSubListeners();
			break;
		case "notification": // An EventSub notification has occurred, such as channel.chat.message
			switch (data.metadata.subscription_type) {
				case "channel.chat.message":
					// First, print the message to the program's console.
					console.log(`MSG #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);

                    let messageText = data.payload.event.message.text.trim()
					messageText = sanitizeInput(messageText)
                    
					try {
                        if (messageText.toLowerCase().startsWith(COMMAND_PREFIX)) {
                            // The message is a command
                            if (messageText.startsWith(COMMAND_PREFIX + "remind")) {
								remindCommand(messageText, data);
                            } else if (messageText.startsWith(COMMAND_PREFIX + "weather")) {
								weatherCommand(messageText, data).catch(error => {
									console.error("Weather command failed:", error);
								})
							}
                        }
                    } catch (error) {
						sendChatMessage('Invalid format. The correct format is: "$remindme in [time] [message]" or "$remind [username] in [time] [message]"')
						console.error(error)
					}

					break;
			}
			break;
	}
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
