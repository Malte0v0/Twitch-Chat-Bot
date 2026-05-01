import { URLSearchParams } from "url";

export class AuthService {
    constructor(oauthToken, refreshToken) {
        this._oauthToken = oauthToken;
        this._refreshToken = refreshToken;

        this._clientId = process.env.CLIENT_ID;
        this._clientSecret = process.env.CLIENT_SECRET;

        this.getAuth();
    }

    get oauthToken() {
        return this._oauthToken;
    }

    get refreshToken() {
        return this._refreshToken;
    }

    get clientId() {
        return this._clientId;
    }

    get clientSecret() {
        return this._clientSecret;
    }

    async refreshOAuthToken() {
        const url = "https://id.twitch.tv/oauth2/token";
        const params = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: this._refreshToken,
            client_id: this._clientId,
            client_secret: this._clientSecret,
        });

        try {
            let response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params,
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error refreshing token:", errorData);
                return null;
            }

            let data = await response.json();
            const { access_token, refresh_token, expires_in } = data;

            // save to .env
            this.updateEnvFile(access_token, refresh_token);

            this._oauthToken = access_token;
            this._refreshToken = refresh_token;

            return expires_in;
        } catch (error) {
            console.error("Error occurred trying to refresh token:", error);
            return null;
        }
    }

    async getAuth() {
        let response = await fetch("https://id.twitch.tv/oauth2/validate", {
            method: "GET",
            headers: {
                Authorization: "OAuth " + this._oauthToken,
            },
        });

        if (response.status != 200) {
            console.log("Token invalid. Refreshing...");
            await this.refreshOAuthToken();
        } else {
            console.log("Validated token.");
        }
    }
}
