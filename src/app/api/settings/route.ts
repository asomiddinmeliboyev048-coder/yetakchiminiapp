
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const initData = request.headers.get("x-telegram-init-data");

    if (!initData) {
      return NextResponse.json(
        { error: "Telegram autentifikatsiyasi topilmadi." },
        { status: 401 }
      );
    }

    const telegramUser = verifyTelegramInitData(initData);

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Telegram autentifikatsiyasi yaroqsiz yoki muddati o'tgan." },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("prayer_reminders, daily_reminders")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (error) {
      console.error("[settings GET]", error.message);
      return NextResponse.json(
        { error: "Sozlamalarni olishda xatolik." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prayerReminders: data?.prayer_reminders ?? true,
      dailyReminders: data?.daily_reminders ?? true,
    });
  } catch (error) {
    console.error("[settings GET]", error);
    return NextResponse.json(
      { error: "Serverda kutilmagan xatolik." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const initData = request.headers.get("x-telegram-init-data");

    if (!initData) {
      return NextResponse.json(
        { error: "Telegram autentifikatsiyasi topilmadi." },
        { status: 401 }
      );
    }

    const telegramUser = verifyTelegramInitData(initData);

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Telegram autentifikatsiyasi yaroqsiz yoki muddati o'tgan." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "So'rov ma'lumotlari noto'g'ri." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;
    const updates: Record<string, boolean> = {};

    if ("prayerReminders" in input) {
      if (typeof input.prayerReminders !== "boolean") {
        return NextResponse.json(
          { error: "Namoz eslatmasi qiymati noto'g'ri." },
          { status: 400 }
        );
      }

      updates.prayer_reminders = input.prayerReminders;
    }

    if ("dailyReminders" in input) {
      if (typeof input.dailyReminders !== "boolean") {
        return NextResponse.json(
          { error: "Kundalik eslatma qiymati noto'g'ri." },
          { status: 400 }
        );
      }

      updates.daily_reminders = input.dailyReminders;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Yangilanadigan sozlama topilmadi." },
        { status: 400 }
      );
    }

    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("telegram_id")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (lookupError) {
      console.error("[settings PATCH lookup]", lookupError.message);
      return NextResponse.json(
        { error: "Foydalanuvchini tekshirishda xatolik." },
        { status: 500 }
      );
    }

    if (!existingUser) {
      return NextResponse.json(
        { error: "Foydalanuvchi bazada topilmadi." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramUser.id);

    if (updateError) {
      console.error("[settings PATCH update]", updateError.message);
      return NextResponse.json(
        { error: "Sozlamalarni saqlashda xatolik." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    console.error("[settings PATCH]", error);
    return NextResponse.json(
      { error: "Serverda kutilmagan xatolik." },
      { status: 500 }
    );
  }
}
