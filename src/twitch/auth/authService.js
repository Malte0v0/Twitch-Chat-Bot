import { AuthClient } from "./authClient.js";

export class AuthService {
    constructor() {
        this.authClient = new AuthClient();
    }

    get oauthToken() {
        return this.authClient.oauthToken;
    }

    get refreshToken() {
        return this.authClient.refreshToken;
    }

    get clientId() {
        return this.authClient.clientId;
    }

    get clientSecret() {
        return this.authClient.clientSecret;
    }

    async refreshOAuthToken() {
        return await this.authClient.refreshOAuthToken();
    }

    async validateToken() {
        return await this.authClient.validateToken();
    }
}
