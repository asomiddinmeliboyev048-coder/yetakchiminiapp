
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyTelegramInitData(initData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || !initData) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");
    const authDate = Number(params.get("auth_date"));
    const userValue = params.get("user");

    if (
      !receivedHash ||
      !/^[a-f0-9]{64}$/i.test(receivedHash) ||
      !userValue ||
      !Number.isSafeInteger(authDate) ||
      authDate <= 0
    ) {
      return null;
    }

    // Telegram initData muddati: 24 soat
    const now = Math.floor(Date.now() / 1000);

    if (authDate > now + 60 || now - authDate > 86400) {
      return null;
    }

    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = createHmac("sha256", botToken)
      .update("WebAppData")
      .digest();

    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const received = Buffer.from(receivedHash, "hex");
    const calculated = Buffer.from(calculatedHash, "hex");

    if (
      received.length !== calculated.length ||
      !timingSafeEqual(received, calculated)
    ) {
      return null;
    }

    const parsedUser: unknown = JSON.parse(userValue);

    if (
      !parsedUser ||
      typeof parsedUser !== "object" ||
      Array.isArray(parsedUser)
    ) {
      return null;
    }

    const user = parsedUser as Record<string, unknown>;

    if (
      typeof user.id !== "number" ||
      !Number.isSafeInteger(user.id) ||
      user.id <= 0
    ) {
      return null;
    }

    return {
      id: user.id,
      first_name: typeof user.first_name === "string"
        ? user.first_name
        : "",
      username: typeof user.username === "string"
        ? user.username
        : undefined,
    };
  } catch {
    return null;
  }
}
