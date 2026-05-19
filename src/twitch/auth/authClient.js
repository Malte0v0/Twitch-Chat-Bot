import { updateEnvFile } from "./envFileService.js";
import { URLSearchParams } from "url";
import { TokenRefreshError, TokenValidateError } from "../../errors/errors.js";
import { logTime } from "../../errors/log.js";

export class AuthClient {
  constructor() {
    this._oauthToken = process.env.OAUTH_TOKEN;
    this._refreshToken = process.env.REFRESH_TOKEN;
    this._clientId = process.env.CLIENT_ID;
    this._clientSecret = process.env.CLIENT_SECRET;

    this.refreshTokenUrl = "https://id.twitch.tv/oauth2/token";
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
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this._refreshToken,
      client_id: this._clientId,
      client_secret: this._clientSecret,
    });

    let response;
    try {
      response = await fetch(this.refreshTokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
    } catch (error) {
      throw new TokenRefreshError(
        "Network error when refreshing Twitch token",
        error,
      );
    }

    let data = await response.json();

    if (!response.ok) {
      throw new TokenRefreshError(
        `Error refreshing token: ${JSON.stringify(data)}`,
      );
    }

    const { access_token, refresh_token, expires_in } = data;

    try {
      updateEnvFile(
        access_token,
        refresh_token,
        this.clientId,
        this.clientSecret,
      );
    } catch (error) {
      logTime(`Failed to persist tokens to .env: ${error.message}`, 3);
    }

    this._oauthToken = access_token;
    this._refreshToken = refresh_token;

    return expires_in;
  }

  async validateToken(attempts = 0) {
    if (attempts >= 3) {
      throw new TokenValidateError(
        `Twitch token still invalid after maximum retries`,
      );
    }
    let response;
    try {
      response = await fetch("https://id.twitch.tv/oauth2/validate", {
        method: "GET",
        signal: AbortSignal.timeout(10000), // don't hang forever
        headers: {
          Authorization: "OAuth " + this._oauthToken,
        },
      });
    } catch {
      await new Promise((res) => setTimeout(res, 5000));
      return await this.validateToken(attempts + 1);
    }

    if (!response?.ok) {
      await this.refreshOAuthToken();
      return await this.validateToken(attempts + 1);
    }

    return true;
  }
}
