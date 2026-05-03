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
        this.authClient.refreshOAuthToken();
    }

    async getAuth() {
        this.authClient.getAuth();
    }
}
