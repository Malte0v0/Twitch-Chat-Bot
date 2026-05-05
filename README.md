# Twitch Chat Bot
## Services
### Earthquakes
The earthquake service sends a chat message whenever a large and dangerous earthquake occurs anywhere in the world. The parameters are changed via code and are not accessible by the users. 

Uses the Seismic Portal earthquake WebSocket from the European-Mediterranean Seismological Center. 

Example output:

`⏰ 🚨 7.2 M earthquake near JAPAN`
### Nitter
Optional service that triggers whenever a person sends an x.com link. The bot then sends a privacy respecting alternative link that doesn't require login to view the content.
## Commands
### Weather
With the $weather (location) command you can get real time weather information about a specific location.
```
15:39 User: $weather Stockholm
15:39 Bot: @User, Stockholm, SE (now): ⛅ 10.81°C (51.46°F), feels like 8.86°C (47.95°F). UV index: 2.09. Cloud cover: 40%. Wind speed: 2.24 m/s. Humidity: 35%. Air pressure: 1007 hPa.
```
### Reminder
Can create and schedule reminders intuitively. Can also remind other users.
```
15:39 User: $remindme in 3 minutes Take trash out
15:39 Bot: @User, I will remind you in 3m (ID 1)
15:42 Bot: @User, reminder from yourself (3m ago): take trash out
```
**You can also set a reminder with the "in (time)" after the $remind part. Like:**
- $remindme in 3d 2h remove old files from the git repo
- $remind Adam in 3h how are you doing?

**The time can be set in many different formats:**
  - `3 days 2 hours`           -> 3 days and 2 hours
  - `3 h 2 day`                      -> 2 days and 3 hours
  - `2 w 1 s 3 h 4 days`     -> 2 weeks 4 days 3 hours and 1 second
### Movie / Nominations
Commands for nominating movies and seeing a list of nominated movies. The list resets every week.
```
15:40 User: $nominate https://www.imdb.com/title/tt0816692/
15:40 Bot: @User, has nominated Interstellar (2014) - imdb.com/title/tt0816692
15:40 User: $movies
15:40 Bot: This weeks nominated movies:
15:40 Bot: 1. Interstellar (2014) - imdb.com/title/tt0816692
```
### Quotes
With the $quote command you can get a random quote. Fetches and caches data from zenquotes.io.
```
15:40 User: $quote
15:40 Bot: "Your problem isn't the problem. Your reaction is the problem." - Unknown
```
### News
With the $news command you can get the top news stories. Fetches data from Google News.
```
15:40 User: $news
15:40 Bot: (3h 1m 8s ago) U.S. attempt to open Strait of Hormuz tests fragile Iran war ceasefire - NPR
```
### Away
```
15:45 User: $afk Be right back!
15:45 Bot: @User is now AFK: Be right back!
15:45 User: I'm back!
15:45 Bot: @User is no longer AFK: Be right back! (7s)
```
### Time
With the $time command you can get the time for various timezones.
