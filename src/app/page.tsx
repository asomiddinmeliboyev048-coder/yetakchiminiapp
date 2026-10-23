"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Compass,
  Heart,
  House,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Volume2,
  X,
} from "lucide-react";

type Tab = "home" | "duas" | "tasbih" | "daily";
type PrayerTimes = Record<string, string>;

const cities = [
  { value: "Tashkent", label: "Toshkent" },
  { value: "Samarkand", label: "Samarqand" },
  { value: "Bukhara", label: "Buxoro" },
  { value: "Jizzax", label: "Jizzax" },
  { value: "Navoiy", label: "Navoiy" },
  { value: "Sirdaryo", label: "Sirdaryo" },
  { value: "Andijan", label: "Andijon" },
  { value: "Namangan", label: "Namangan" },
  { value: "Fergana", label: "Farg‘ona" },
  { value: "Karshi", label: "Qarshi" },
  { value: "Nukus", label: "Nukus" },
  { value: "Termez", label: "Termiz" },
  { value: "Urgench", label: "Urganch" },
];

const prayerList = [
  { key: "Fajr", label: "Bomdod" },
  { key: "Sunrise", label: "Quyosh" },
  { key: "Dhuhr", label: "Peshin" },
  { key: "Asr", label: "Asr" },
  { key: "Maghrib", label: "Shom" },
  { key: "Isha", label: "Xufton" },
];

const duas = [
  {
    title: "Subhanalloh",
    arabic: "سُبْحَانَ اللَّهِ",
    reading: "Subhanalloh",
    meaning: "Alloh barcha nuqsonlardan pokdir.",
    count: 33,
    category: "Tasbeh",
  },
  {
    title: "Alhamdulillah",
    arabic: "الْحَمْدُ لِلَّهِ",
    reading: "Alhamdulillah",
    meaning: "Barcha hamd-u sanolar Alloh uchundir.",
    count: 33,
    category: "Tasbeh",
  },
  {
    title: "Allohu akbar",
    arabic: "اللَّهُ أَكْبَرُ",
    reading: "Allohu akbar",
    meaning: "Alloh eng buyukdir.",
    count: 34,
    category: "Tasbeh",
  },
  {
    title: "Istig‘for",
    arabic: "أَسْتَغْفِرُ اللَّهَ",
    reading: "Astag‘firulloh",
    meaning: "Allohdan mag‘firat so‘rayman.",
    count: 100,
    category: "Istig‘for",
  },
];

const dailyItems = [
  {
    type: "Qur’ondan oyat",
    title: "Qiyinchilikdan keyin yengillik",
    text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
    translation: "Albatta, qiyinchilik bilan birga yengillik bordir.",
    source: "Sharh surasi, 6-oyat",
  },
  {
    type: "Hadis",
    title: "Amallar niyatga bog‘liq",
    text: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",
    translation:
      "Albatta, amallar niyatlarga bog‘liqdir. Har bir kishiga niyat qilgan narsasi bo‘ladi.",
    source: "Sahih al-Buxoriy, 1-hadis",
  },
];

function isValidCity(city: unknown): city is string {
  return typeof city === "string" && cities.some((item) => item.value === city);
}

function getTashkentDate(timestamp: number): Date {
  return new Date(
    new Date(timestamp).toLocaleString("en-US", {
      timeZone: "Asia/Tashkent",
    }),
  );
}

function getMinutes(value?: string): number {
  if (!value) return -1;

  const [hours, minutes] = value.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return -1;
  }

  return hours * 60 + minutes;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [selectedZikr, setSelectedZikr] = useState(duas[0]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const [dailyIndex, setDailyIndex] = useState(0);

  const [prayerOpen, setPrayerOpen] = useState(false);
  const [prayerCity, setPrayerCity] = useState("Tashkent");
  const [telegramSyncReady, setTelegramSyncReady] = useState(false);
  const [cityChangeVersion, setCityChangeVersion] = useState(0);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const telegramInitDataRef = useRef<string | null>(null);
  const profileCityRef = useRef<string | null>(null);
  const cityChangeVersionRef = useRef(0);
  const handledCityChangeVersionRef = useRef(0);

  // Soat boshlang‘ich renderda hisoblanmaydi.
  const [clock, setClock] = useState(0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [prayerRemindersEnabled, setPrayerRemindersEnabled] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(true);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderAvailable, setReminderAvailable] = useState(false);
  const [reminderError, setReminderError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function syncTelegramProfile() {
      let savedCity: string | null = null;

      try {
        savedCity = localStorage.getItem("yetaklovchi-prayer-city");
      } catch (error) {
        console.error("Saqlangan shaharni o'qish xatosi:", error);
      }

      try {
        const { default: WebApp } = await import("@twa-dev/sdk");

        if (cancelled) return;

        WebApp.ready();
        const initData = WebApp.initData;

        if (!initData) {
          if (isValidCity(savedCity)) {
            setPrayerCity(savedCity);
          }

          setTelegramSyncReady(true);
          return;
        }

        telegramInitDataRef.current = initData;

        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "x-telegram-init-data": initData,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Profilni yuklab bo'lmadi.");
        }

        const result = await response.json();

        if (cancelled) return;

        const city: unknown = result.profile?.city;
        profileCityRef.current = isValidCity(city) ? city : null;

        if (cityChangeVersionRef.current === 0) {
          if (isValidCity(city)) {
            setPrayerCity(city);
          } else if (isValidCity(savedCity)) {
            setPrayerCity(savedCity);
          }
        }

        setTelegramSyncReady(true);
      } catch (error) {
        console.error("Telegram profil sinxronlash xatosi:", error);

        if (cancelled) return;

        if (
          cityChangeVersionRef.current === 0 &&
          isValidCity(savedCity)
        ) {
          setPrayerCity(savedCity);
        }

        setTelegramSyncReady(true);
      }
    }

    void syncTelegramProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!telegramSyncReady) return;

    let cancelled = false;
    const controller = new AbortController();

    async function loadPrayerReminderSetting() {
      try {
        const initData = telegramInitDataRef.current;

        if (!initData) {
          setReminderLoading(false);
          return;
        }

        telegramInitDataRef.current = initData;
        setReminderAvailable(true);

        const response = await fetch("/api/settings", {
          method: "GET",
          headers: {
            "x-telegram-init-data": initData,
          },
          cache: "no-store",
          signal: controller.signal,
        });
        const result: unknown = await response.json();

        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Namoz eslatma holatini yuklab bo'lmadi.";
          throw new Error(message);
        }

        if (
          !result ||
          typeof result !== "object" ||
          !("prayerRemindersEnabled" in result) ||
          typeof result.prayerRemindersEnabled !== "boolean"
        ) {
          throw new Error("Namoz eslatma holati noto'g'ri qaytdi.");
        }

        if (!cancelled) {
          setPrayerRemindersEnabled(result.prayerRemindersEnabled);
          setReminderError("");
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Namoz eslatma holatini yuklash xatosi:", error);

          if (!cancelled) {
            setReminderError(
              error instanceof Error
                ? error.message
                : "Namoz eslatma holatini yuklab bo'lmadi.",
            );
          }
        }
      } finally {
        if (!cancelled) {
          setReminderLoading(false);
        }
      }
    }

    void loadPrayerReminderSetting();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [telegramSyncReady]);

  useEffect(() => {
    if (
      !telegramSyncReady ||
      cityChangeVersion === handledCityChangeVersionRef.current
    ) {
      return;
    }

    const initData = telegramInitDataRef.current;

    if (!initData) return;

    handledCityChangeVersionRef.current = cityChangeVersion;

    if (prayerCity === profileCityRef.current) return;

    const controller = new AbortController();

    async function saveCity(verifiedInitData: string) {
      try {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-telegram-init-data": verifiedInitData,
          },
          body: JSON.stringify({ city: prayerCity }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Shaharni bazaga saqlab bo'lmadi.");
        }

        if (!controller.signal.aborted) {
          profileCityRef.current = prayerCity;
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Shaharni saqlash xatosi:", error);
        }
      }
    }

    void saveCity(initData);

    return () => controller.abort();
  }, [cityChangeVersion, prayerCity, telegramSyncReady]);

  function handlePrayerCityChange(city: string) {
    if (city === prayerCity) return;

    cityChangeVersionRef.current += 1;
    setCityChangeVersion(cityChangeVersionRef.current);
    setPrayerCity(city);
  }

  async function updatePrayerReminderSetting(enabled: boolean) {
    const initData = telegramInitDataRef.current;

    if (!initData || !reminderAvailable || reminderSaving) return;

    setReminderSaving(true);
    setReminderError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify({ prayerRemindersEnabled: enabled }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Namoz eslatma sozlamasini saqlab bo'lmadi.";
        throw new Error(message);
      }

      if (
        !result ||
        typeof result !== "object" ||
        !("prayerRemindersEnabled" in result) ||
        typeof result.prayerRemindersEnabled !== "boolean"
      ) {
        throw new Error("Saqlangan namoz eslatma holati noto'g'ri qaytdi.");
      }

      setPrayerRemindersEnabled(result.prayerRemindersEnabled);
    } catch (error) {
      console.error("Namoz eslatma sozlamasini saqlash xatosi:", error);
      setReminderError(
        error instanceof Error
          ? error.message
          : "Namoz eslatma sozlamasini saqlab bo'lmadi.",
      );
    } finally {
      setReminderSaving(false);
    }
  }

  // Brauzer ochilgach, vaqtni har soniyada yangilash.
  useEffect(() => {
    const updateClock = () => setClock(Date.now());

    updateClock();

    const timer = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Saqlangan sozlamalarni yuklash.
  useEffect(() => {
    let savedCount: number | null = null;
    let savedTarget: number | null = null;
    let savedSound: boolean | null = null;
    let savedVibration: boolean | null = null;

    try {
      const countValue = localStorage.getItem("yetaklovchi-tasbih-count");

      if (countValue !== null) {
        const parsed = Number(countValue);

        if (Number.isFinite(parsed) && parsed >= 0) {
          savedCount = parsed;
        }
      }

      const targetValue = localStorage.getItem("yetaklovchi-tasbih-target");

      if (targetValue !== null) {
        const parsed = Number(targetValue);

        if ([33, 99, 100, 999].includes(parsed)) {
          savedTarget = parsed;
        }
      }

      const soundValue = localStorage.getItem("yetaklovchi-sound");

      if (soundValue !== null) {
        savedSound = soundValue === "true";
      }

      const vibrationValue = localStorage.getItem("yetaklovchi-vibration");

      if (vibrationValue !== null) {
        savedVibration = vibrationValue === "true";
      }
    } catch {
      // Xotira ishlamasa ham ilova ochilishi kerak.
    }

    const animationFrame = window.requestAnimationFrame(() => {
      if (savedCount !== null) setCount(savedCount);
      if (savedTarget !== null) setTarget(savedTarget);
      if (savedSound !== null) setSoundEnabled(savedSound);
      if (savedVibration !== null) setVibrationEnabled(savedVibration);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (!telegramSyncReady) return;

    try {
      localStorage.setItem("yetaklovchi-prayer-city", prayerCity);
    } catch {}
  }, [prayerCity, telegramSyncReady]);

  useEffect(() => {
    try {
      localStorage.setItem("yetaklovchi-tasbih-count", String(count));
    } catch {}
  }, [count]);

  useEffect(() => {
    try {
      localStorage.setItem("yetaklovchi-tasbih-target", String(target));
    } catch {}
  }, [target]);

  useEffect(() => {
    try {
      localStorage.setItem("yetaklovchi-sound", String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "yetaklovchi-vibration",
        String(vibrationEnabled),
      );
    } catch {}
  }, [vibrationEnabled]);

  // Namoz vaqtlarini faqat jadval ochilganda so‘rash.
  useEffect(() => {
    if (!prayerOpen) return;

    const controller = new AbortController();

    async function loadPrayerTimes() {
      setPrayerLoading(true);
      setPrayerError("");

      try {
        const response = await fetch(
          `/api/prayer-times?city=${encodeURIComponent(prayerCity)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Namoz vaqtlarini olib bo‘lmadi.",
          );
        }

        setPrayerTimes(data.times);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setPrayerError(
          error instanceof Error
            ? error.message
            : "Namoz vaqtlarini olishda xatolik yuz berdi.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setPrayerLoading(false);
        }
      }
    }

    void loadPrayerTimes();

    return () => controller.abort();
  }, [prayerOpen, prayerCity, retryKey]);

  // Hozirgi vaqt Toshkent vaqt mintaqasida hisoblanadi.
  const now = useMemo(
    () => (clock > 0 ? getTashkentDate(clock) : null),
    [clock],
  );

  const currentMinutes = now
    ? now.getHours() * 60 + now.getMinutes()
    : 0;

  const nextPrayer = useMemo(() => {
    if (!prayerTimes || !now) return null;

    const upcoming = prayerList
      .filter((prayer) => prayer.key !== "Sunrise")
      .map((prayer) => ({
        ...prayer,
        time: prayerTimes[prayer.key],
        minutes: getMinutes(prayerTimes[prayer.key]),
      }))
      .filter((prayer) => prayer.minutes >= 0)
      .find((prayer) => prayer.minutes > currentMinutes);

    if (upcoming) {
      return {
        ...upcoming,
        remaining: upcoming.minutes - currentMinutes,
      };
    }

    const fajrMinutes = getMinutes(prayerTimes.Fajr);

    if (fajrMinutes < 0) return null;

    return {
      key: "Fajr",
      label: "Bomdod",
      time: prayerTimes.Fajr,
      minutes: fajrMinutes,
      remaining: 1440 - currentMinutes + fajrMinutes,
    };
  }, [prayerTimes, currentMinutes, now]);

  const remainingText = useMemo(() => {
    if (!nextPrayer || !now) return "";

    const seconds = now.getSeconds();
    const totalSeconds = Math.max(
      0,
      nextPrayer.remaining * 60 - seconds,
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return [hours, minutes, secs]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }, [nextPrayer, now]);

  const filteredDuas = useMemo(() => {
    return duas.filter((dua) => {
      const matchesSearch = [
        dua.title,
        dua.reading,
        dua.meaning,
        dua.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      return (
        matchesSearch &&
        (category === "Barchasi" || dua.category === category)
      );
    });
  }, [search, category]);

  const formattedDate = now
    ? now.toLocaleDateString("uz-UZ", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Asia/Tashkent",
      })
    : "";

  const activeCity =
    cities.find((city) => city.value === prayerCity)?.label ?? "Toshkent";

  function changeTab(nextTab: Tab) {
    setTab(nextTab);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function incrementTasbih() {
    setCount((previous) => previous + 1);

    if (soundEnabled) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gain = context.createGain();

          oscillator.frequency.value = 880;
          gain.gain.value = 0.04;

          oscillator.connect(gain);
          gain.connect(context.destination);

          oscillator.start();
          oscillator.stop(context.currentTime + 0.06);

          oscillator.onended = () => {
            void context.close();
          };
        }
      } catch {}
    }

    if (
      vibrationEnabled &&
      typeof navigator !== "undefined" &&
      "vibrate" in navigator
    ) {
      navigator.vibrate?.(20);
    }
  }

  function resetTasbih() {
    setCount(0);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="brand-mark"
          onClick={() => changeTab("home")}
          aria-label="Bosh sahifa"
        >
          <span className="brand-symbol">
            <Moon size={23} />
          </span>
          <span className="brand-name">Yetaklovchi</span>
        </button>

        <button
          className="icon-button"
          aria-label="Sozlamalar"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 size={21} />
        </button>
      </header>

      {tab === "home" && (
        <>
          <section className="hero-card">
            <div className="hero-decoration hero-decoration-one" />
            <div className="hero-decoration hero-decoration-two" />

            <span className="hero-eyebrow">
              <Sparkles size={15} /> QALBINGIZGA OROM
            </span>

            <h1>
              Har kuningizni
              <br />
              yaxshilik bilan boshlang.
            </h1>

            <p>Ibodat, zikr va foydali eslatmalar — barchasi bir joyda.</p>

            <div className="hero-date">
              <CalendarDays size={16} />
              <span>{formattedDate}</span>
            </div>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">BUGUNGI IBODAT</span>
                <h2>Davom eting</h2>
              </div>
              <span className="soft-icon">
                <Sun size={20} />
              </span>
            </div>

            <button
              className="feature-card prayer-card"
              onClick={() => setPrayerOpen(true)}
            >
              <span className="feature-icon">
                <Compass size={23} />
              </span>

              <span className="feature-copy">
                <strong>Namoz vaqtlari</strong>
                <small>
                  {nextPrayer
                    ? `${activeCity} · ${nextPrayer.label}gacha ${remainingText}`
                    : "Shahringizdagi namoz vaqtlarini ko‘ring"}
                </small>
              </span>

              <ChevronRight size={20} className="muted-icon" />
            </button>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">KUNDALIK ODATLAR</span>
                <h2>O‘zingizga vaqt ajrating</h2>
              </div>
            </div>

            <div className="quick-grid">
              <button
                className="quick-card"
                onClick={() => changeTab("duas")}
              >
                <span className="quick-icon">
                  <Heart size={21} />
                </span>
                <strong>Duolar</strong>
                <small>Yod oling va o‘qing</small>
                <ChevronRight size={17} />
              </button>

              <button
                className="quick-card"
                onClick={() => changeTab("tasbih")}
              >
                <span className="quick-icon">
                  <Sun size={21} />
                </span>
                <strong>Elektron tasbeh</strong>
                <small>Zikringizni sanang</small>
                <ChevronRight size={17} />
              </button>

              <button
                className="quick-card"
                onClick={() => changeTab("daily")}
              >
                <span className="quick-icon">
                  <BookOpen size={21} />
                </span>
                <strong>Har kun</strong>
                <small>Oyat va hadis</small>
                <ChevronRight size={17} />
              </button>
            </div>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">BUGUNGI ESLATMA</span>
                <h2>Qalbga yaqin so‘zlar</h2>
              </div>
              <span className="soft-icon">
                <BookOpen size={20} />
              </span>
            </div>

            <button
              className="daily-card"
              onClick={() => changeTab("daily")}
            >
              <span className="daily-card-label">
                {dailyItems[dailyIndex].type}
              </span>
              <h3>{dailyItems[dailyIndex].title}</h3>
              <p className="arabic-text">{dailyItems[dailyIndex].text}</p>
              <p>{dailyItems[dailyIndex].translation}</p>
              <small>{dailyItems[dailyIndex].source}</small>
              <span className="daily-card-link">
                Batafsil <ChevronRight size={16} />
              </span>
            </button>
          </section>
        </>
      )}

      {tab === "duas" && (
        <section className="section-block page-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">QALB OSOYISHTALIGI</span>
              <h2>Duolar va zikrlar</h2>
              <p>Har kuni zikr qilishga odatlaning.</p>
            </div>
            <span className="soft-icon">
              <Heart size={20} />
            </span>
          </div>

          <div className="search-box">
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Duo yoki zikr izlash..."
              aria-label="Duo izlash"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Qidiruvni tozalash"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="filter-row">
            {["Barchasi", "Tasbeh", "Istig‘for"].map((item) => (
              <button
                key={item}
                className={`filter-chip ${category === item ? "active" : ""}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="dua-list">
            {filteredDuas.map((dua) => (
              <article className="dua-card" key={dua.title}>
                <div className="dua-card-top">
                  <span className="dua-category">{dua.category}</span>
                  <span className="dua-count">{dua.count} marta</span>
                </div>

                <h3>{dua.title}</h3>
                <p className="arabic-text">{dua.arabic}</p>
                <p className="dua-reading">{dua.reading}</p>
                <p className="dua-meaning">{dua.meaning}</p>

                <button
                  className="text-action"
                  onClick={() => {
                    setSelectedZikr(dua);
                    setTarget(dua.count);
                    setCount(0);
                    changeTab("tasbih");
                  }}
                >
                  Tasbehda boshlash <ChevronRight size={17} />
                </button>
              </article>
            ))}

            {filteredDuas.length === 0 && (
              <div className="empty-state">
                Bu so‘rov bo‘yicha duo topilmadi.
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "tasbih" && (
        <section className="section-block page-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">ZIKR VA XOTIRJAMLIK</span>
              <h2>Elektron tasbeh</h2>
              <p>Zikringizni shoshilmasdan davom ettiring.</p>
            </div>
            <span className="soft-icon">
              <Sun size={20} />
            </span>
          </div>

          <div className="tasbih-card">
            <label htmlFor="zikr-select">Zikrni tanlang</label>

            <select
              id="zikr-select"
              value={selectedZikr.title}
              onChange={(event) => {
                const chosen = duas.find(
                  (dua) => dua.title === event.target.value,
                );

                if (chosen) {
                  setSelectedZikr(chosen);
                  setTarget(chosen.count);
                  setCount(0);
                }
              }}
            >
              {duas.map((dua) => (
                <option key={dua.title} value={dua.title}>
                  {dua.title}
                </option>
              ))}
            </select>

            <p className="arabic-text tasbih-arabic">
              {selectedZikr.arabic}
            </p>
            <p className="tasbih-meaning">{selectedZikr.meaning}</p>

            <div className="tasbih-counter">
              <div className="counter-ring">
                <span className="counter-label">ZIKRLAR SONI</span>
                <strong>{count}</strong>
                <span className="counter-target">Maqsad: {target}</span>
              </div>
            </div>

            <div className="progress-track">
              <div
                className="progress-value"
                style={{
                  width: `${Math.min(100, (count / target) * 100)}%`,
                }}
              />
            </div>

            <p className="progress-caption">
              {count >= target
                ? "Maqsadga yetdingiz. Alloh qabul qilsin!"
                : `${Math.max(target - count, 0)} ta zikr qoldi`}
            </p>

            <button
              className="tasbih-main-button"
              onClick={incrementTasbih}
            >
              <Plus size={24} />
              Zikr qilish
            </button>

            <div className="tasbih-controls">
              <button
                className="secondary-action"
                onClick={() =>
                  setCount((previous) => Math.max(0, previous - 1))
                }
              >
                <Minus size={17} /> Kamaytirish
              </button>

              <button className="secondary-action" onClick={resetTasbih}>
                <RotateCcw size={17} /> Qayta boshlash
              </button>
            </div>

            <div className="target-options">
              <span>Maqsad soni</span>

              {[33, 99, 100, 999].map((value) => (
                <button
                  key={value}
                  className={`target-chip ${target === value ? "active" : ""}`}
                  onClick={() => setTarget(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-inline">
            <div>
              <Volume2 size={19} />
              <span>Ovozli signal</span>
            </div>

            <button
              className={`toggle ${soundEnabled ? "on" : ""}`}
              onClick={() => setSoundEnabled((value) => !value)}
              aria-label="Ovozli signalni yoqish yoki o‘chirish"
              aria-pressed={soundEnabled}
            >
              <span />
            </button>
          </div>

          <div className="settings-inline">
            <div>
              <Sparkles size={19} />
              <span>Vibratsiya</span>
            </div>

            <button
              className={`toggle ${vibrationEnabled ? "on" : ""}`}
              onClick={() => setVibrationEnabled((value) => !value)}
              aria-label="Vibratsiyani yoqish yoki o‘chirish"
              aria-pressed={vibrationEnabled}
            >
              <span />
            </button>
          </div>

          <p className="small-note">
            Vibratsiya faqat qurilma va brauzer qo‘llab-quvvatlasa ishlaydi.
          </p>
        </section>
      )}

      {tab === "daily" && (
        <section className="section-block page-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                HAR KUNGI MA’NAVIY OZUQA
              </span>
              <h2>Har kun uchun</h2>
              <p>Oyat va hadislar bilan kuningizni boyiting.</p>
            </div>
            <span className="soft-icon">
              <BookOpen size={20} />
            </span>
          </div>

          <div className="daily-switcher">
            {dailyItems.map((item, index) => (
              <button
                key={item.type}
                className={dailyIndex === index ? "active" : ""}
                onClick={() => setDailyIndex(index)}
              >
                {item.type}
              </button>
            ))}
          </div>

          <article className="daily-card daily-card-large">
            <span className="daily-card-label">
              {dailyItems[dailyIndex].type}
            </span>
            <h3>{dailyItems[dailyIndex].title}</h3>
            <p className="arabic-text">{dailyItems[dailyIndex].text}</p>
            <div className="daily-divider" />
            <span className="section-kicker">MA’NOSI</span>
            <p className="daily-translation">
              {dailyItems[dailyIndex].translation}
            </p>
            <small>{dailyItems[dailyIndex].source}</small>
          </article>

          <button
            className="feature-card"
            onClick={() =>
              setDailyIndex((previous) => (previous + 1) % dailyItems.length)
            }
          >
            <span className="feature-icon">
              <RotateCcw size={21} />
            </span>
            <span className="feature-copy">
              <strong>Keyingi eslatma</strong>
              <small>Boshqa oyat yoki hadisni ko‘rish</small>
            </span>
            <ChevronRight size={20} className="muted-icon" />
          </button>

          <p className="small-note">
            Bu bo‘lim hozircha namunaviy, statik kontentdan iborat.
          </p>
        </section>
      )}

      <nav className="bottom-nav">
        <button
          className={tab === "home" ? "active" : ""}
          onClick={() => changeTab("home")}
        >
          <House size={21} />
          <span>Bosh sahifa</span>
        </button>

        <button
          className={tab === "duas" ? "active" : ""}
          onClick={() => changeTab("duas")}
        >
          <Heart size={21} />
          <span>Duolar</span>
        </button>

        <button
          className={tab === "tasbih" ? "active" : ""}
          onClick={() => changeTab("tasbih")}
        >
          <Sun size={21} />
          <span>Tasbeh</span>
        </button>

        <button
          className={tab === "daily" ? "active" : ""}
          onClick={() => changeTab("daily")}
        >
          <BookOpen size={21} />
          <span>Har kun</span>
        </button>
      </nav>

      {prayerOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setPrayerOpen(false)}
        >
          <section
            className="prayer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prayer-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <span className="section-kicker">BUGUNGI IBODAT</span>
                <h2 id="prayer-modal-title">Namoz vaqtlari</h2>
              </div>

              <button
                className="icon-button"
                aria-label="Yopish"
                onClick={() => setPrayerOpen(false)}
              >
                <X size={21} />
              </button>
            </header>

            <label className="modal-label" htmlFor="prayer-city">
              Shaharni tanlang
            </label>

            <select
              className="city-select"
              id="prayer-city"
              value={prayerCity}
              onChange={(event) => handlePrayerCityChange(event.target.value)}
            >
              {cities.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>

            {prayerLoading && (
              <div className="loading-state">
                <span className="loading-spinner" />
                <p>Namoz vaqtlari yuklanmoqda...</p>
              </div>
            )}

            {!prayerLoading && prayerError && (
              <div className="error-state">
                <p>{prayerError}</p>
                <button
                  className="secondary-action"
                  onClick={() => setRetryKey((value) => value + 1)}
                >
                  <RotateCcw size={17} /> Qayta urinish
                </button>
              </div>
            )}

            {!prayerLoading && !prayerError && prayerTimes && (
              <>
                <div className="next-prayer-card">
                  <span>Keyingi namoz</span>
                  <h3>{nextPrayer?.label ?? "Namoz vaqtlari"}</h3>
                  <strong>{nextPrayer?.time ?? "—"}</strong>

                  {nextPrayer && (
                    <p>
                      <span>Qolgan vaqt</span> {remainingText}
                    </p>
                  )}
                </div>

                <div className="prayer-times-list">
                  {prayerList.map((prayer) => (
                    <div
                      className={`prayer-time-row ${
                        nextPrayer?.key === prayer.key ? "current" : ""
                      }`}
                      key={prayer.key}
                    >
                      <span>{prayer.label}</span>
                      <strong>{prayerTimes[prayer.key] || "—"}</strong>

                      {nextPrayer?.key === prayer.key && (
                        <Check size={17} />
                      )}
                    </div>
                  ))}
                </div>

                <p className="small-note">
                  Vaqtlar namoz-vaqti.uz xizmatidan olinadi. Sana:{" "}
                  {now
                    ? now.toLocaleDateString("uz-UZ", {
                        timeZone: "Asia/Tashkent",
                      })
                    : "Yuklanmoqda..."}
                </p>
              </>
            )}
          </section>
        </div>
      )}

      {settingsOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setSettingsOpen(false)}
        >
          <section
            className="prayer-modal settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <span className="section-kicker">MOSLASHTIRISH</span>
                <h2 id="settings-modal-title">Sozlamalar</h2>
              </div>

              <button
                className="icon-button"
                aria-label="Yopish"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={21} />
              </button>
            </header>

            <label className="modal-label" htmlFor="settings-city">
              Asosiy shahar
            </label>

            <select
              id="settings-city"
              className="city-select"
              value={prayerCity}
              onChange={(event) => handlePrayerCityChange(event.target.value)}
            >
              {cities.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>

            <div className="settings-inline">
              <div>
                <CalendarDays size={19} />
                <span>Namoz eslatmalari</span>
              </div>

              <button
                className={`toggle ${prayerRemindersEnabled ? "on" : ""}`}
                type="button"
                onClick={() =>
                  void updatePrayerReminderSetting(!prayerRemindersEnabled)
                }
                aria-label="Namoz eslatmalarini yoqish yoki o‘chirish"
                aria-pressed={prayerRemindersEnabled}
                aria-busy={reminderSaving}
                disabled={
                  reminderLoading || reminderSaving || !reminderAvailable
                }
              >
                <span />
              </button>
            </div>

            {reminderLoading && (
              <p className="small-note">Eslatma sozlamasi yuklanmoqda...</p>
            )}

            {!reminderLoading && !reminderAvailable && (
              <p className="small-note">
                Namoz eslatmalarini boshqarish uchun Telegram Mini App ichida
                oching.
              </p>
            )}

            {reminderSaving && (
              <p className="small-note">Eslatma sozlamasi saqlanmoqda...</p>
            )}

            {reminderError && (
              <div className="error-state" role="alert">
                <p>{reminderError}</p>
              </div>
            )}

            <button
              className="feature-card settings-feature"
              onClick={() => {
                setSettingsOpen(false);
                setPrayerOpen(true);
              }}
            >
              <span className="feature-icon">
                <Compass size={21} />
              </span>
              <span className="feature-copy">
                <strong>Namoz vaqtlari</strong>
                <small>Jadvalni ko‘rish va shaharni tanlash</small>
              </span>
              <ChevronRight size={19} />
            </button>

            <p className="small-note">
              Namoz bildirishnomalari va Telegram orqali eslatmalar keyingi
              bosqichda ulanadi.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
