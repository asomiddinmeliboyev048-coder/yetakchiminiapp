
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramInitDataUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
const MAX_FUTURE_SKEW_SECONDS = 60;

export function verifyTelegramInitData(
  initData: string
): TelegramWebAppUser | null {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || !initData || initData.length > 16384) {
      return null;
    }

    const params = new URLSearchParams(initData);

    const receivedHash = params.get("hash");
    const userString = params.get("user");
    const authDateString = params.get("auth_date");

    if (!receivedHash || !userString || !authDateString) {
      return null;
    }

    if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
      return null;
    }

    const authDate = Number(authDateString);

    if (!Number.isSafeInteger(authDate) || authDate <= 0) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      authDate > now + MAX_FUTURE_SKEW_SECONDS ||
      now - authDate > MAX_AUTH_AGE_SECONDS
    ) {
      return null;
    }

    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest();

    const providedHash = Buffer.from(receivedHash, "hex");

    if (
      providedHash.length !== calculatedHash.length ||
      !timingSafeEqual(providedHash, calculatedHash)
    ) {
      return null;
    }

    const parsedUser = JSON.parse(userString) as TelegramInitDataUser;

    if (
      !parsedUser ||
      typeof parsedUser.id !== "number" ||
      !Number.isSafeInteger(parsedUser.id) ||
      parsedUser.id <= 0 ||
      typeof parsedUser.first_name !== "string"
    ) {
      return null;
    }

    return {
      id: parsedUser.id,
      first_name: parsedUser.first_name,
      ...(typeof parsedUser.last_name === "string"
        ? { last_name: parsedUser.last_name }
        : {}),
      ...(typeof parsedUser.username === "string"
        ? { username: parsedUser.username }
        : {}),
    };
  } catch (error) {
    console.error(
      "[telegram-auth] Telegram initData tekshirishda xatolik:",
      error instanceof Error ? error.message : "Noma'lum xatolik"
    );

    return null;
  }
}
