import { event } from "../utils/events.js";
import { msToHuman } from "../utils/timeUtils.js";

const GTA_6_RELEASE_DATE = new Date("November 19, 2026");

const rareLink = [
  "https://youtu.be/xZiSW0rI_9Y",
  "https://youtu.be/joMjcNtxuTU",
  "https://youtu.be/fD0kL-xbabg",
  "https://youtu.be/cYG3S32OFCE",
  "https://youtu.be/nfv4S2pK-PU",
];

export class GtaCounterService {
  constructor(chatService) {
    this.chatService = chatService;
    this.event = event;
  }

  start() {
    this.event.on("user_appeared", (data) => {
      const message = data.payload.event.message.text;
      const user = data.payload.event.chatter_user_login;

      if (
        (message.includes(" 6 ") || message.startsWith("6")) &&
        user !== "hououlnkyouma"
      ) {
        const untilGta = GTA_6_RELEASE_DATE.getTime() - Date.now();

        const rareLinkOrNo =
          Math.random() < 0.05
            ? "Luciass " +
              rareLink[Math.floor(Math.random() * rareLink.length)] +
              " Luciass"
            : "greekHeyy";

        this.chatService.sendMessage(
          `GTA 6 COMES OUT IN ${msToHuman(untilGta)} ${rareLinkOrNo}`,
        );
      }
    });
  }
}
