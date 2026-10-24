
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTelegramUser(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");

  if (!initData) {
    return null;
  }

  return verifyTelegramInitData(initData);
}

function getReminderState(profile: {
  prayer_reminders_enabled?: boolean | null;
  prayer_reminders?: boolean | null;
}) {
  // Yangi ustun asosiy hisoblanadi; eski ustun esa
  // avvalgi bot kodi bilan moslik uchun saqlanadi.
  return profile.prayer_reminders_enabled === true ||
    (profile.prayer_reminders_enabled == null &&
      profile.prayer_reminders === true);
}

export async function GET(request: NextRequest) {
  const telegramUser = getTelegramUser(request);

  if (!telegramUser) {
    return NextResponse.json(
      { error: "Telegram foydalanuvchisini tekshirish muvaffaqiyatsiz." },
      { status: 401 }
    );
  }

  const { data: profile, error } = await supabaseAdmin
    .from("users")
    .select("prayer_reminders_enabled, prayer_reminders")
    .eq("telegram_id", telegramUser.id)
    .maybeSingle();

  if (error) {
    console.error("Settings GET error:", error);

    return NextResponse.json(
      { error: "Eslatma sozlamalarini olishda xatolik yuz berdi." },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "Foydalanuvchi profili topilmadi. Avval botda /start bosing." },
      { status: 404 }
    );
  }

  const prayerRemindersEnabled = getReminderState(profile);

  return NextResponse.json({
    prayerRemindersEnabled,
  });
}

export async function PATCH(request: NextRequest) {
  const telegramUser = getTelegramUser(request);

  if (!telegramUser) {
    return NextResponse.json(
      { error: "Telegram foydalanuvchisini tekshirish muvaffaqiyatsiz." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON ma’lumotlarini o‘qib bo‘lmadi." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    typeof (body as Record<string, unknown>).prayerRemindersEnabled !==
      "boolean"
  ) {
    return NextResponse.json(
      { error: "prayerRemindersEnabled boolean qiymat bo‘lishi kerak." },
      { status: 400 }
    );
  }

  const enabled = (
    body as Record<string, boolean>
  ).prayerRemindersEnabled;

  const { data: profile, error } = await supabaseAdmin
    .from("users")
    .update({
      prayer_reminders: enabled,
      prayer_reminders_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_id", telegramUser.id)
    .select("telegram_id")
    .maybeSingle();

  if (error) {
    console.error("Settings PATCH error:", error);

    return NextResponse.json(
      { error: "Eslatma sozlamalarini saqlashda xatolik yuz berdi." },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "Foydalanuvchi profili topilmadi. Avval botda /start bosing." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    prayerRemindersEnabled: enabled,
  });
}
