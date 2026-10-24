
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

function getTelegramUser(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");

  if (!initData) {
    return null;
  }

  return verifyTelegramInitData(initData);
}

export async function GET(request: NextRequest) {
  try {
    const telegramUser = getTelegramUser(request);

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Telegram foydalanuvchisi tasdiqlanmadi." },
        { status: 401 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("telegram_id, prayer_reminders, prayer_reminders_enabled, daily_reminders")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (error) {
      console.error("Settings GET Supabase xatosi:", error.message);

      return NextResponse.json(
        { error: "Sozlamalarni yuklab bo‘lmadi." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      prayerReminders: Boolean(
        data?.prayer_reminders_enabled ?? data?.prayer_reminders ?? false,
      ),
      dailyReminders: Boolean(data?.daily_reminders ?? false),
    });
  } catch (error) {
    console.error("Settings GET xatosi:", error);

    return NextResponse.json(
      { error: "Sozlamalarni olishda kutilmagan xatolik." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const telegramUser = getTelegramUser(request);

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Telegram foydalanuvchisi tasdiqlanmadi." },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "So‘rov ma’lumotlari noto‘g‘ri." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Sozlamalar formati noto‘g‘ri." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("prayerReminders" in input) {
      if (typeof input.prayerReminders !== "boolean") {
        return NextResponse.json(
          { error: "Namoz eslatmasi qiymati true yoki false bo‘lishi kerak." },
          { status: 400 },
        );
      }

      updates.prayer_reminders_enabled = input.prayerReminders;
      updates.prayer_reminders = input.prayerReminders;
    }

    if ("dailyReminders" in input) {
      if (typeof input.dailyReminders !== "boolean") {
        return NextResponse.json(
          { error: "Kundalik eslatma qiymati true yoki false bo‘lishi kerak." },
          { status: 400 },
        );
      }

      updates.daily_reminders = input.dailyReminders;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: "Saqlash uchun sozlama berilmadi." },
        { status: 400 },
      );
    }

    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("telegram_id")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Settings user lookup xatosi:", lookupError.message);

      return NextResponse.json(
        { error: "Foydalanuvchi ma’lumotlarini tekshirib bo‘lmadi." },
        { status: 500 },
      );
    }

    if (!existingUser) {
      return NextResponse.json(
        {
          error:
            "Profil topilmadi. Avval Yetaklovchi Telegram botini /start orqali oching.",
        },
        { status: 404 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramUser.id);

    if (updateError) {
      console.error("Settings PATCH Supabase xatosi:", updateError.message);

      return NextResponse.json(
        { error: "Sozlamalarni saqlab bo‘lmadi." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      prayerReminders:
        typeof input.prayerReminders === "boolean"
          ? input.prayerReminders
          : undefined,
      dailyReminders:
        typeof input.dailyReminders === "boolean"
          ? input.dailyReminders
          : undefined,
    });
  } catch (error) {
    console.error("Settings PATCH xatosi:", error);

    return NextResponse.json(
      { error: "Sozlamalarni saqlashda kutilmagan xatolik." },
      { status: 500 },
    );
  }
}
