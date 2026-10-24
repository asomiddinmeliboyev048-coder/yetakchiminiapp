
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CITIES = [
  "Toshkent",
  "Samarqand",
  "Buxoro",
  "Jizzax",
  "Navoiy",
  "Sirdaryo",
  "Andijon",
  "Namangan",
  "Farg‘ona",
  "Qarshi",
  "Nukus",
  "Termiz",
  "Urganch",
] as const;

const ALLOWED_LANGUAGES = ["uz", "uz_cyr"] as const;

function getTelegramUser(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");

  if (!initData) {
    return null;
  }

  return verifyTelegramInitData(initData);
}

function isValidCity(value: unknown): value is (typeof ALLOWED_CITIES)[number] {
  return (
    typeof value === "string" &&
    ALLOWED_CITIES.some((city) => city === value)
  );
}

function isValidLanguage(
  value: unknown
): value is (typeof ALLOWED_LANGUAGES)[number] {
  return (
    typeof value === "string" &&
    ALLOWED_LANGUAGES.some((language) => language === value)
  );
}

function handleDatabaseError(error: unknown) {
  console.error("Profile API database error:", error);

  return NextResponse.json(
    { error: "Profil ma’lumotlarini saqlashda xatolik yuz berdi." },
    { status: 500 }
  );
}

async function ensureUserExists(telegramId: number) {
  const { data: existingUser, error: selectError } = await supabaseAdmin
    .from("users")
    .select("telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingUser) {
    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from("users")
    .insert({
      telegram_id: telegramId,
      language: "uz",
      prayer_reminders: false,
      prayer_reminders_enabled: false,
      daily_reminders: false,
    });

  if (insertError) {
    // Parallel so'rov sababli foydalanuvchi oldindan yaratilgan
    // bo'lishi mumkin. Bunday vaziyatda mavjud qatorni tekshiramiz.
    const { data: userAfterInsert, error: retryError } =
      await supabaseAdmin
        .from("users")
        .select("telegram_id")
        .eq("telegram_id", telegramId)
        .maybeSingle();

    if (retryError) {
      throw retryError;
    }

    if (!userAfterInsert) {
      throw insertError;
    }
  }
}

export async function GET(request: NextRequest) {
  const telegramUser = getTelegramUser(request);

  if (!telegramUser) {
    return NextResponse.json(
      { error: "Telegram foydalanuvchisini tekshirish muvaffaqiyatsiz." },
      { status: 401 }
    );
  }

  try {
    await ensureUserExists(telegramUser.id);

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select(
        [
          "telegram_id",
          "language",
          "city",
          "prayer_reminders",
          "prayer_reminders_enabled",
          "daily_reminders",
          "first_name",
          "last_name",
          "username",
          "phone_number",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .eq("telegram_id", telegramUser.id)
      .single();

    if (error) {
      return handleDatabaseError(error);
    }

    return NextResponse.json({
      profile: {
        ...profile,
        first_name: profile.first_name ?? telegramUser.first_name,
        last_name:
          profile.last_name ??
          telegramUser.last_name ??
          null,
        username:
          profile.username ??
          telegramUser.username ??
          null,
      },
    });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const telegramUser = getTelegramUser(request);

  if (!telegramUser) {
    return NextResponse.json(
      { error: "Telegram foydalanuvchisini tekshirish muvaffaqiyatsiz." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;

  try {
    const parsedBody: unknown = await request.json();

    if (
      typeof parsedBody !== "object" ||
      parsedBody === null ||
      Array.isArray(parsedBody)
    ) {
      return NextResponse.json(
        { error: "So‘rov ma’lumotlari noto‘g‘ri." },
        { status: 400 }
      );
    }

    body = parsedBody as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "JSON ma’lumotlarini o‘qib bo‘lmadi." },
      { status: 400 }
    );
  }

  const updates: Record<string, string> = {};

  if (Object.prototype.hasOwnProperty.call(body, "city")) {
    if (!isValidCity(body.city)) {
      return NextResponse.json(
        { error: "Tanlangan shahar ro‘yxatda mavjud emas." },
        { status: 400 }
      );
    }

    updates.city = body.city;
  }

  if (Object.prototype.hasOwnProperty.call(body, "language")) {
    if (!isValidLanguage(body.language)) {
      return NextResponse.json(
        { error: "Tanlangan til qo‘llab-quvvatlanmaydi." },
        { status: 400 }
      );
    }

    updates.language = body.language;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Yangilash uchun shahar yoki til yuborilishi kerak." },
      { status: 400 }
    );
  }

  try {
    await ensureUserExists(telegramUser.id);

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_id", telegramUser.id)
      .select(
        [
          "telegram_id",
          "language",
          "city",
          "prayer_reminders",
          "prayer_reminders_enabled",
          "daily_reminders",
          "first_name",
          "last_name",
          "username",
          "phone_number",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .single();

    if (error) {
      return handleDatabaseError(error);
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
