import fs from "fs";
import { dirname, resolve } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { fileURLToPath } from "url";

export function updateEnvFile(
    newOAuthToken,
    newRefreshToken,
    clientId,
    clientSecret,
) {
    const envPath = resolve(__dirname, "../../../.env");
    let env = {};
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    lines.forEach((line) => {
        const [key, ...rest] = line.split("=");
        if (key) {
            env[key.trim()] = rest.join("=").trim();
        }
    });

    env["OAUTH_TOKEN"] = newOAuthToken;
    env["CLIENT_ID"] = clientId;
    env["CLIENT_SECRET"] = clientSecret;
    env["REFRESH_TOKEN"] = newRefreshToken;

    const updatedEnv = Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

    fs.writeFileSync(envPath, updatedEnv, "utf-8");
}
