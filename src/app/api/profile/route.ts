
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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const telegramUser = getTelegramUser(request);

    if (!telegramUser) {
      return jsonError("Telegram foydalanuvchisi tasdiqlanmadi.", 401);
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        "telegram_id, first_name, last_name, username, phone_number, language, city, prayer_reminders, prayer_reminders_enabled, daily_reminders",
      )
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile GET Supabase xatosi:", error.message);
      return jsonError("Profil ma’lumotlarini yuklab bo‘lmadi.", 500);
    }

    if (!data) {
      return NextResponse.json({
        profile: {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name ?? "",
          last_name: telegramUser.last_name ?? "",
          username: telegramUser.username ?? null,
          phone_number: null,
          language: "uz",
          city: null,
          prayer_reminders: false,
          prayer_reminders_enabled: false,
          daily_reminders: false,
        },
        profileSaved: false,
      });
    }

    // Telegram'dan kelgan ism va username'ni ko'rsatamiz.
    // Botda saqlangan telefon raqamini o'zgartirmaymiz.
    const profile = {
      ...data,
      first_name: telegramUser.first_name || data.first_name || "",
      last_name: telegramUser.last_name || data.last_name || "",
      username: telegramUser.username || data.username || null,
    };

    return NextResponse.json({
      profile,
      profileSaved: true,
    });
  } catch (error) {
    console.error("Profile GET xatosi:", error);
    return jsonError("Profilni olishda kutilmagan xatolik yuz berdi.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const telegramUser = getTelegramUser(request);

    if (!telegramUser) {
      return jsonError("Telegram foydalanuvchisi tasdiqlanmadi.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError("So‘rov ma’lumotlari noto‘g‘ri.", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("Ma’lumotlar formati noto‘g‘ri.", 400);
    }

    const input = body as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("city" in input) {
      if (typeof input.city !== "string" || !input.city.trim()) {
        return jsonError("Shahar nomi noto‘g‘ri.", 400);
      }

      const allowedCities = [
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
      ];

      if (!allowedCities.includes(input.city)) {
        return jsonError("Bu shahar ro‘yxatda mavjud emas.", 400);
      }

      updates.city = input.city;
    }

    if ("language" in input) {
      if (
        typeof input.language !== "string" ||
        !["uz", "uz_cyr", "ru"].includes(input.language)
      ) {
        return jsonError("Tanlangan til qo‘llab-quvvatlanmaydi.", 400);
      }

      updates.language = input.language;
    }

    if (Object.keys(updates).length === 1) {
      return jsonError("Saqlash uchun o‘zgarish berilmadi.", 400);
    }

    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("telegram_id")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Profile lookup xatosi:", lookupError.message);
      return jsonError("Profilni tekshirib bo‘lmadi.", 500);
    }

    if (!existingUser) {
      return jsonError(
        "Profil topilmadi. Telegram botida /start buyrug‘ini bosing va qayta urinib ko‘ring.",
        404,
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("telegram_id", telegramUser.id);

    if (updateError) {
      console.error("Profile PATCH Supabase xatosi:", updateError.message);
      return jsonError("Profilni saqlab bo‘lmadi.", 500);
    }

    const { data: updatedProfile, error: fetchError } = await supabaseAdmin
      .from("users")
      .select(
        "telegram_id, first_name, last_name, username, phone_number, language, city, prayer_reminders, prayer_reminders_enabled, daily_reminders",
      )
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Updated profile fetch xatosi:", fetchError.message);
      return jsonError("Saqlangan profilni qayta olishda xatolik.", 500);
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Profile PATCH xatosi:", error);
    return jsonError("Profilni saqlashda kutilmagan xatolik yuz berdi.", 500);
  }
}
