import { event } from "../utils/events.js";
import { msToHuman } from "../utils/timeUtils.js";

const rareLink = [
  "rare links",
  "rare links",
  "rare links",
  "rare links",
  "rare links",
];

export class ReleaseDateCounterService {
  constructor(
    chatService,
    chatEvent = event,
    releaseDate = () => new Date("November 19, 2026"),
    now = () => Date.now(),
    random = () => Math.random(),
  ) {
    this.chatService = chatService;
    this.chatEvent = chatEvent;

    this.releaseDate = releaseDate;
    this.now = now;
    this.random = random;

    this.started = false;

    this.handleData = (data) => {
      const { user, message } = this.parseData(data);

      if (this.shouldRespond(user, message)) {
        this.chatService.sendMessage(this.formatChatMessage());
      }
    };
  }

  formatChatMessage() {
    const untilReleaseDate = this.releaseDate().getTime() - this.now();
    const baseMessage = `${msToHuman(untilReleaseDate)}`;

    const rareLink = this.getRareLink();

    return rareLink !== ""
      ? `${baseMessage} ${rareLink}`
      : `${baseMessage}`;
  }

  parseData(data) {
    return {
      user: data.payload.event.chatter_user_login,
      message: data.payload.event.message.text,
    };
  }

  shouldRespond(user, message) {
    if (user === "hououlnkyouma") return false;
    return message.match(/(^6\s)|(\s6\s)|(\s6$)|(^6$)/) ? true : false;
  }

  getRareLink() {
    return this.random() < 0.05
      ? rareLink[Math.floor(this.random() * rareLink.length)]
      : "";
  }

  start() {
    if (this.started) return;
    this.started = true;

    this.chatEvent.on("user_appeared", this.handleData);
  }

  stop() {
    this.chatEvent.off("user_appeared", this.handleData);
    this.started = false;
  }
}
