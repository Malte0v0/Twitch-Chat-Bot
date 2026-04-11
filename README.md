# Twitch Chat Bot
## Commands
### Reminders
Can create and schedule reminders intuitively. Can also remind other users. Example:
- $remindme remove old files from the git repo in 3d 2h

This will remind you with the message "remove old files from the git repo" in 3 days and 2 hours.
- $remind Bert123 how are you doing? in 3h

Sends the message "how are you doing?" to the user "Bert123" in 3 hours.
- $remind Malte0v0 i'm doing good

Sends the message "i'm doing good" to user "Malte0v0" the next time they type in chat.

**You can also set a reminder with the "in (time)" after the $remind part. Like:**
- $remindme in 3d 2h remove old files from the git repo
- $remind Bert123 in 3h how are you doing?
### Weather
With the $weather (location) command you can get real time weather information about a specific location. Example:

`Stockholm, SE (now): ☀️ 10°C (50.00°F), feels like 7.73°C (45.91°F). UV index: 0.64. Cloud cover: 0%. Wind speed: 4.63 m/s. Humidity: 30%. Air pressure: 1023 hPa.`
### Quote
WIth the $quote command you can get a random quote. Example:

`"If you haven't the strength to impose your own terms upon life, then you must accept the terms it offers you." - T.S. Eliot`
### Time
With the $time command you can get the time for various timezones.
### News
With the $news command you can get the top news stories.
### AFK/Sleep
With the $afk and $sleep commands you can signal that you are going away for a while. The next time you type in chat it will send a message saying how long you have been away for.

Usage:
$afk (optional message)
## Services
### Earthquakes
The earthquake service sends a chat message whenever a large and dangerous earthquake occurs anywhere in the world. The parameters are changed via code and are not accessible by the users. Example output:

`⏰ 🚨 7.2 M earthquake near JAPAN`
### Nitter
Optional service that triggers whenever a person sends an x.com link. The bot then sends a privacy respecting alternative link that doesn't require login to view the content.
