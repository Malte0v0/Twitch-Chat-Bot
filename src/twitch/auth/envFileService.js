import fs from "fs";
import { resolve } from "path";

export function updateEnvFile(
  newOAuthToken,
  newRefreshToken,
  clientId,
  clientSecret,
) {
  const envPath = resolve(process.cwd(), ".env");
  let env = {};
  let lines;
  try {
    lines = fs.readFileSync(envPath, "utf-8").split("\n");
  } catch (error) {
    throw new Error(
      `Failed to read .env file at ${envPath}: ${error.message}`,
      { cause: error },
    );
  }
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

  process.env.OAUTH_TOKEN = newOAuthToken;
  process.env.REFRESH_TOKEN = newRefreshToken;

  const updatedEnv = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  fs.writeFileSync(envPath, updatedEnv, "utf-8");
}
