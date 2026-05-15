export class AlreadyNominatedError extends Error {
    constructor(message) {
        super(message);
        this.name = "AlreadyNominated";
    }
}

export class UserHasntNominatedError extends Error {
    constructor(message) {
        super(message);
        this.name = "UserHasntNominatedError";
    }
}

export class BotError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = this.constructor.name;
        this.cause = cause;
    }
}

export class DatabaseError extends BotError {}
export class ParseError extends BotError {}
export class FormattingError extends BotError {}
export class WebSocketError extends BotError {}

export class HttpError extends BotError {}
export class EventSubError extends HttpError {}
export class ChatError extends HttpError {}

export class AuthError extends HttpError {}
export class TokenRefreshError extends AuthError {}
export class TokenValidateError extends AuthError {}
