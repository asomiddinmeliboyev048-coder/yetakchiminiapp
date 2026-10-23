
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

const ALLOWED_CITIES = [
  "Tashkent",
  "Samarkand",
  "Bukhara",
  "Jizzax",
  "Navoiy",
  "Sirdaryo",
  "Andijan",
  "Namangan",
  "Fergana",
  "Karshi",
  "Nukus",
  "Termez",
  "Urgench",
] as const;

const ALLOWED_LANGUAGES = ["uz", "uz_cyr"] as const;

function getTelegramUser(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");

  if (!initData) {
    return null;
  }

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

  try {
    const { data: existingUser, error: readError } =
      await supabaseAdmin
        .from("users")
        .select(
          "telegram_id, language, city, prayer_reminders_enabled, daily_reminders"
        )
        .eq("telegram_id", telegramUser.id)
        .maybeSingle();

    if (readError) {
      console.error("Profilni o'qish xatosi:", readError);
      return NextResponse.json(
        { error: "Profilni o'qib bo'lmadi." },
        { status: 500 }
      );
    }

    let user = existingUser;

    if (!user) {
      const { data: newUser, error: insertError } =
        await supabaseAdmin
          .from("users")
          .upsert(
            {
              telegram_id: telegramUser.id,
              language: "uz",
              prayer_reminders_enabled: false,
            },
            { onConflict: "telegram_id", ignoreDuplicates: true }
          )
          .select(
            "telegram_id, language, city, prayer_reminders_enabled, daily_reminders"
          )
          .maybeSingle();

      if (insertError) {
        console.error("Profil yaratish xatosi:", insertError);
        return NextResponse.json(
          { error: "Profil yaratib bo'lmadi." },
          { status: 500 }
        );
      }

      user = newUser;

      // Boshqa so'rov bir vaqtda profil yaratgan bo'lishi mumkin.
      if (!user) {
        const { data: retryUser, error: retryError } =
          await supabaseAdmin
            .from("users")
            .select(
              "telegram_id, language, city, prayer_reminders_enabled, daily_reminders"
            )
            .eq("telegram_id", telegramUser.id)
            .maybeSingle();

        if (retryError || !retryUser) {
          return NextResponse.json(
            { error: "Profilni olishning imkoni bo'lmadi." },
            { status: 500 }
          );
        }

        user = retryUser;
      }
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error("Profil API xatosi:", error);
    return NextResponse.json(
      { error: "Serverda kutilmagan xatolik yuz berdi." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const telegramUser = getTelegramUser(request);

  if (!telegramUser) {
    return NextResponse.json(
      { error: "Telegram foydalanuvchisi tasdiqlanmadi." },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "So'rov ma'lumotlari noto'g'ri." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;
    const updates: Record<string, string> = {};

    if ("city" in input) {
      if (
        typeof input.city !== "string" ||
        !ALLOWED_CITIES.includes(
          input.city as (typeof ALLOWED_CITIES)[number]
        )
      ) {
        return NextResponse.json(
          { error: "Tanlangan shahar noto'g'ri." },
          { status: 400 }
        );
      }

      updates.city = input.city;
    }

    if ("language" in input) {
      if (
        typeof input.language !== "string" ||
        !ALLOWED_LANGUAGES.includes(
          input.language as (typeof ALLOWED_LANGUAGES)[number]
        )
      ) {
        return NextResponse.json(
          { error: "Tanlangan til noto'g'ri." },
          { status: 400 }
        );
      }

      updates.language = input.language;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Saqlash uchun sozlama yuborilmadi." },
        { status: 400 }
      );
    }

    // Faqat tasdiqlangan Telegram foydalanuvchisining profilini yangilaymiz.
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_id", telegramUser.id)
      .select(
        "telegram_id, language, city, prayer_reminders_enabled, daily_reminders"
      )
      .maybeSingle();

    if (error) {
      console.error("Profilni yangilash xatosi:", error);
      return NextResponse.json(
        { error: "Profilni saqlash amalga oshmadi." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Profil topilmadi. Avval profilni yuklang." },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error("Profilni saqlash xatosi:", error);
    return NextResponse.json(
      { error: "Sozlamalarni saqlashda xatolik yuz berdi." },
      { status: 500 }
    );
  }
}
