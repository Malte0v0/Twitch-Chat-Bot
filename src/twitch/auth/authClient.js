export class AuthClient {
    constructor() {
        this.oauthToken = process.env.OAUTH_TOKEN;
        this.refreshToken = process.env.REFRESH_TOKEN;

        this.clientId = process.env.CLIENT_ID;
        this.clientSecret = process.env.CLIENT_SECRET;
    }

    get oauthToken() {
        return this.oauthToken;
    }

    get refreshToken() {
        return this.refreshToken;
    }

    get clientId() {
        return this.clientId;
    }

    get clientSecret() {
        return this.clientSecret;
    }

    async refreshOAuthToken() {
        const url = "https://id.twitch.tv/oauth2/token";
        const params = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: this.refreshToken,
            client_id: this.clientId,
            client_secret: this.clientSecret,
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
            updateEnvFile(access_token, refresh_token);

            this.oauthToken = access_token;
            this.refreshToken = refresh_token;

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
                Authorization: "OAuth " + this.oauthToken,
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
