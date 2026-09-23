import { ReminderService } from "./commands/reminder/reminderService.js";
import { AwayService } from "./commands/away/awayService.js";
import { AWAY_STATUS } from "./commands/away/awayStatus.js";
import { UserService } from "./user/userService.js";
import { ReleaseDateCounterService } from "./gta/ReleaseDateCounterService.js";

export class CommandController {
  constructor(chatService, database, scheduler) {
    this.chatService = chatService;
    this.database = database;
    this.scheduler = scheduler;

    const userService = new UserService(database);
    userService.startListening();
    const userRepository = userService.getUserRepository();

    this.reminderService = new ReminderService(
      chatService,
      userRepository,
      database,
      scheduler,
    );
    this.reminderService.startListening();

    this.awayService = new AwayService(chatService, database);
    this.awayService.start();

    this.releaseDateCounter = new ReleaseDateCounterService(this.chatService);
    this.releaseDateCounter.start();

    this.execute = this.debounce(this.executeCommand, 500);
  }

  async executeCommand(command, messageText, data) {
    const userId = data.payload.event.chatter_user_id;
    const userLogin = data.payload.event.chatter_user_login;
    const userName = data.payload.event.chatter_user_name;

    switch (command) {
      case "remind":
      case "remindme":
        this.reminderService.create(
          userId,
          (command + " " + messageText).trim(),
        );
        break;
      case "unset":
        this.reminderService.delete(userLogin, userId, messageText);
        break;
      case "printreminders":
        this.reminderService.print();
        break;
      case "afk":
        await this.awayService.setAway(
          messageText,
          userId,
          userName,
          AWAY_STATUS.afk,
        );
        break;
      case "sleep":
        await this.awayService.setAway(
          messageText,
          userId,
          userName,
          AWAY_STATUS.asleep,
        );
        break;
      case "shower":
        await this.awayService.setAway(
          messageText,
          userId,
          userName,
          AWAY_STATUS.showering,
        );
        break;
    }
  }

  async handleCommand(command, messageText, data) {
    this.execute(command, messageText, data);
  }

  debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }
}
