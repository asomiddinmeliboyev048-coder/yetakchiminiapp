
import { NextRequest, NextResponse } from "next/server";

const CITY_SLUGS: Record<string, string> = {
  Tashkent: "toshkent",
  Samarkand: "samarqand",
  Bukhara: "buxoro",
  Jizzax: "jizzax-viloyati",
  Navoiy: "navoiy-viloyati",
  Sirdaryo: "sirdaryo",
  Andijan: "andijon",
  Namangan: "namangan",
  Fergana: "fargona",
  Karshi: "qarshi",
  Nukus: "nukus",
  Termez: "termiz",
  Urgench: "urganch",
};

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city") ?? "Tashkent";
  const region = CITY_SLUGS[city];

  if (!region) {
    return NextResponse.json(
      { error: "Tanlangan shahar topilmadi." },
      { status: 400 },
    );
  }

  try {
    const url = new URL("https://namoz-vaqti.uz/index.php");
    url.searchParams.set("region", region);
    url.searchParams.set("lang", "lotin");
    url.searchParams.set("period", "today");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Namoz API xatosi: ${response.status}`);
    }

    const result = await response.json();
    const timings = result?.today?.times;

    const mapping = {
      Fajr: "bomdod",
      Sunrise: "quyosh",
      Dhuhr: "peshin",
      Asr: "asr",
      Maghrib: "shom",
      Isha: "xufton",
    } as const;

    const times = Object.fromEntries(
      Object.entries(mapping).map(([key, apiKey]) => [
        key,
        String(timings?.[apiKey] ?? "").trim(),
      ]),
    );

    if (Object.values(times).some((time) => !time)) {
      throw new Error("API barcha namoz vaqtlarini qaytarmadi.");
    }

    return NextResponse.json(
      {
        city,
        times,
        date: new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Tashkent",
        }),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Namoz vaqtlarini olishda xato:", error);

    return NextResponse.json(
      {
        error:
          "Namoz vaqtlarini olishning imkoni bo‘lmadi. Keyinroq qayta urinib ko‘ring.",
      },
      { status: 502 },
    );
  }
}
