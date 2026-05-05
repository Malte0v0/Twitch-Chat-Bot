export class UserParser {
    static parse(data) {
        return {
            userId: data.payload.event.chatter_user_id,
            userLogin: data.payload.event.chatter_user_login,
            userName: data.payload.event.chatter_user_name,
        };
    }
}
