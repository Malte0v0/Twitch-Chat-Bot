import type { ChatPort } from "../../core/ports/ChatPort.js";
import type { ChatService } from "../chat/chatService.js";

export class TwitchChatAdapter implements ChatPort {
  constructor(private chatService: ChatService) {}

  send(message: string): Promise<void> {
    return this.chatService.sendMessageAsync(message);
  }

  replyTo(userName: string, message: string): Promise<void> {
    return this.chatService.sendFormattedMessageAsync(userName, message);
  }
}
