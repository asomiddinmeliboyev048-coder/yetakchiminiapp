
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getTelegramUser(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");

  if (!initData) return null;

  return verifyTelegramInitData(initData);
}

export async function GET(request: NextRequest) {
  try {
    const telegramUser = getTelegramUser(request);

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Telegram autentifikatsiyasi yaroqsiz." },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        "telegram_id, first_name, last_name, username, phone_number, language, city, created_at"
      )
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (error) {
      console.error("[profile GET]", error.message);
      return NextResponse.json(
        { error: "Profilni olishda xatolik." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        profile: {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name ?? null,
          username: telegramUser.username ?? null,
          phone_number: null,
          language: "uz",
          city: null,
          created_at: null,
        },
      });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("[profile GET]", error);
    return NextResponse.json(
      { error: "Serverda kutilmagan xatolik." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const telegramUser = getTelegramUser(request);

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Telegram autentifikatsiyasi yaroqsiz." },
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
    const updates: Record<string, string | null> = {};

    if ("city" in input) {
      if (
        input.city !== null &&
        (typeof input.city !== "string" ||
          input.city.trim().length === 0 ||
          input.city.trim().length > 100)
      ) {
        return NextResponse.json(
          { error: "Shahar nomi noto'g'ri." },
          { status: 400 }
        );
      }

      updates.city =
        typeof input.city === "string" ? input.city.trim() : null;
    }

    if ("language" in input) {
      if (
        typeof input.language !== "string" ||
        !["uz", "uz_cyr", "ru"].includes(input.language)
      ) {
        return NextResponse.json(
          { error: "Tanlangan til qo'llab-quvvatlanmaydi." },
          { status: 400 }
        );
      }

      updates.language = input.language;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Yangilanadigan profil ma'lumoti topilmadi." },
        { status: 400 }
      );
    }

    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("telegram_id")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (lookupError) {
      console.error("[profile PATCH lookup]", lookupError.message);
      return NextResponse.json(
        { error: "Foydalanuvchini tekshirishda xatolik." },
        { status: 500 }
      );
    }

    if (!existingUser) {
      return NextResponse.json(
        {
          error:
            "Profil bazada topilmadi. Avval Telegram bot orqali /start yuboring.",
        },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramUser.id);

    if (updateError) {
      console.error("[profile PATCH update]", updateError.message);
      return NextResponse.json(
        { error: "Profilni saqlashda xatolik." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    console.error("[profile PATCH]", error);
    return NextResponse.json(
      { error: "Serverda kutilmagan xatolik." },
      { status: 500 }
    );
  }
}
