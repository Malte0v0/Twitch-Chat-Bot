export class UserParser {
    static parse(data) {
        return {
            userId: data.event.chatter_user_id,
            userLogin: data.event.chatter_user_login,
            userName: data.event.chatter_user_name,
        };
    }
}
