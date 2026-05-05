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
