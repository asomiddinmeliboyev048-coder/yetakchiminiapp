
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
const CLOCK_SKEW_SECONDS = 60;

export function verifyTelegramInitData(
  initData: string
): TelegramWebAppUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || !initData) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);

    const receivedHash = params.get("hash");
    const authDateValue = params.get("auth_date");
    const userValue = params.get("user");

    if (
      !receivedHash ||
      !/^[a-f0-9]{64}$/i.test(receivedHash) ||
      !authDateValue ||
      !userValue
    ) {
      return null;
    }

    const authDate = Number(authDateValue);

    if (!Number.isSafeInteger(authDate) || authDate <= 0) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      authDate > now + CLOCK_SKEW_SECONDS ||
      now - authDate > MAX_AUTH_AGE_SECONDS
    ) {
      return null;
    }

    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([keyA], [keyB]) =>
        keyA < keyB ? -1 : keyA > keyB ? 1 : 0
      )
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const receivedBuffer = Buffer.from(receivedHash, "hex");
    const calculatedBuffer = Buffer.from(calculatedHash, "hex");

    if (
      receivedBuffer.length !== calculatedBuffer.length ||
      !timingSafeEqual(receivedBuffer, calculatedBuffer)
    ) {
      return null;
    }

    const parsedUser: unknown = JSON.parse(userValue);

    if (
      typeof parsedUser !== "object" ||
      parsedUser === null ||
      Array.isArray(parsedUser)
    ) {
      return null;
    }

    const user = parsedUser as Record<string, unknown>;

    if (
      typeof user.id !== "number" ||
      !Number.isSafeInteger(user.id) ||
      user.id <= 0 ||
      typeof user.first_name !== "string"
    ) {
      return null;
    }

    return {
      id: user.id,
      first_name: user.first_name,
      ...(typeof user.last_name === "string"
        ? { last_name: user.last_name }
        : {}),
      ...(typeof user.username === "string"
        ? { username: user.username }
        : {}),
    };
  } catch {
    return null;
  }
}
