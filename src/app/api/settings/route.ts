
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

function getTelegramUser(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");

  if (!initData) return null;

  return verifyTelegramInitData(initData);
}

export async function GET(request: NextRequest) {
  const telegramUser = getTelegramUser(request);

  if (!telegramUser) {
    return NextResponse.json(
      { error: "Telegram foydalanuvchisi tasdiqlanmadi." },
      { status: 401 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("prayer_reminders_enabled")
    .eq("telegram_id", telegramUser.id)
    .maybeSingle();

  if (error) {
    console.error("Eslatma sozlamasini o'qish xatosi:", error);

    return NextResponse.json(
      { error: "Eslatma sozlamasini o'qib bo'lmadi." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Profil topilmadi. Avval profilni yuklang." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    prayerRemindersEnabled: data.prayer_reminders_enabled,
  });
}

export async function PATCH(request: NextRequest) {
  const telegramUser = getTelegramUser(request);

  if (!telegramUser) {
    return NextResponse.json(
      { error: "Telegram foydalanuvchisi tasdiqlanmadi." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON ma'lumotlari noto'g'ri." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof (body as Record<string, unknown>).prayerRemindersEnabled !==
      "boolean"
  ) {
    return NextResponse.json(
      { error: "Eslatma holati true yoki false bo'lishi kerak." },
      { status: 400 }
    );
  }

  const enabled = (
    body as { prayerRemindersEnabled: boolean }
  ).prayerRemindersEnabled;

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({
      prayer_reminders_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_id", telegramUser.id)
    .select("prayer_reminders_enabled")
    .maybeSingle();

  if (error) {
    console.error("Eslatma sozlamasini saqlash xatosi:", error);

    return NextResponse.json(
      { error: "Eslatma sozlamasini saqlab bo'lmadi." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Profil topilmadi. Avval profilni yuklang." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    prayerRemindersEnabled: data.prayer_reminders_enabled,
  });
}
