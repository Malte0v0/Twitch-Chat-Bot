export interface ChatPort {
  send(message: string): Promise<void>;
  replyTo(userName: string, message: string): Promise<void>;
}
