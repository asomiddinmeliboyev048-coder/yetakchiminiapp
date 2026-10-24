
"use client";

import { useEffect, useMemo, useState } from "react";
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
  UserRound,
  Volume2,
  X,
} from "lucide-react";

type Tab = "home" | "duas" | "tasbih" | "daily" | "profile";

type UserProfile = {
  telegram_id?: number;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  phone_number?: string | null;
  language?: string | null;
  city?: string | null;
  prayer_reminders?: boolean;
  prayer_reminders_enabled?: boolean;
  daily_reminders?: boolean;
};

type TelegramWindow = Window & {
  Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } };
};

function getTelegramInitData(): string {
  if (typeof window === "undefined") return "";
  return (window as TelegramWindow).Telegram?.WebApp?.initData ?? "";
}
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
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  // Soat boshlang‘ich renderda hisoblanmaydi.
  const [clock, setClock] = useState(0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [prayerReminders, setPrayerReminders] = useState(false);
  const [dailyReminders, setDailyReminders] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Telegram Mini App boshlang‘ich sozlamalari.
  useEffect(() => {
    const webApp = (window as TelegramWindow).Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
  }, []);

  // Profil va eslatma sozlamalarini Telegram initData orqali yuklash.
  useEffect(() => {
    if (tab !== "profile") return;

    const initData = getTelegramInitData();
    if (!initData) {
      setProfileError("Profilni ko‘rish uchun Yetaklovchi Mini App’ni Telegram ichidan oching.");
      return;
    }

    const controller = new AbortController();
    const headers = { "x-telegram-init-data": initData };

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");
      setProfileMessage("");
      try {
        const [profileResponse, settingsResponse] = await Promise.all([
          fetch("/api/profile", { headers, cache: "no-store", signal: controller.signal }),
          fetch("/api/settings", { headers, cache: "no-store", signal: controller.signal }),
        ]);
        const profileData = await profileResponse.json();
        const settingsData = await settingsResponse.json();
        if (!profileResponse.ok) throw new Error(profileData.error || "Profilni yuklab bo‘lmadi.");
        if (!settingsResponse.ok) throw new Error(settingsData.error || "Sozlamalarni yuklab bo‘lmadi.");

        const nextProfile = (profileData.profile ?? null) as UserProfile | null;
        setProfile(nextProfile);
        setProfileSaved(Boolean(profileData.profileSaved));
        setPrayerReminders(Boolean(settingsData.prayerReminders));
        setDailyReminders(Boolean(settingsData.dailyReminders));

        const savedCity = nextProfile?.city;
        if (savedCity && cities.some((city) => city.value.toLowerCase() === savedCity.toLowerCase())) {
          setPrayerCity(cities.find((city) => city.value.toLowerCase() === savedCity.toLowerCase())!.value);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setProfileError(error instanceof Error ? error.message : "Profilni yuklashda xatolik yuz berdi.");
      } finally {
        if (!controller.signal.aborted) setProfileLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [tab]);

  async function saveProfileCity(city: string) {
    setPrayerCity(city);
    setProfileMessage("");
    setProfileError("");
    const initData = getTelegramInitData();
    if (!initData) {
      setProfileError("Telegram ichidan ochilgan Mini App talab qilinadi.");
      return;
    }
    setProfileSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
        body: JSON.stringify({ city }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Shaharni saqlab bo‘lmadi.");
      setProfile(data.profile ?? profile);
      setProfileSaved(true);
      setProfileMessage("Shahar saqlandi.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Shaharni saqlashda xatolik yuz berdi.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveReminderSettings(nextPrayer: boolean, nextDaily: boolean) {
    setPrayerReminders(nextPrayer);
    setDailyReminders(nextDaily);
    setProfileError("");
    setProfileMessage("");
    const initData = getTelegramInitData();
    if (!initData) {
      setProfileError("Telegram ichidan ochilgan Mini App talab qilinadi.");
      return;
    }
    setProfileSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
        body: JSON.stringify({ prayerReminders: nextPrayer, dailyReminders: nextDaily }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sozlamalarni saqlab bo‘lmadi.");
      setProfileMessage("Eslatma sozlamalari saqlandi.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Sozlamalarni saqlashda xatolik yuz berdi.");
    } finally {
      setProfileSaving(false);
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
    try {
      const savedCity = localStorage.getItem("yetaklovchi-prayer-city");

      if (savedCity && cities.some((city) => city.value === savedCity)) {
        setPrayerCity(savedCity);
      }

      const savedCount = localStorage.getItem("yetaklovchi-tasbih-count");

      if (savedCount !== null) {
        const parsed = Number(savedCount);

        if (Number.isFinite(parsed) && parsed >= 0) {
          setCount(parsed);
        }
      }

      const savedTarget = localStorage.getItem("yetaklovchi-tasbih-target");

      if (savedTarget !== null) {
        const parsed = Number(savedTarget);

        if ([33, 99, 100, 999].includes(parsed)) {
          setTarget(parsed);
        }
      }

      const savedSound = localStorage.getItem("yetaklovchi-sound");

      if (savedSound !== null) {
        setSoundEnabled(savedSound === "true");
      }

      const savedVibration = localStorage.getItem("yetaklovchi-vibration");

      if (savedVibration !== null) {
        setVibrationEnabled(savedVibration === "true");
      }
    } catch {
      // Xotira ishlamasa ham ilova ochilishi kerak.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("yetaklovchi-prayer-city", prayerCity);
    } catch {}
  }, [prayerCity]);

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

      {tab === "profile" && (
        <section className="content-section profile-section">
          <div className="section-heading">
            <span className="section-kicker">SHAXSIY KABINET</span>
            <h1>Profilim</h1>
            <p>Telegram ma’lumotlaringiz va eslatma sozlamalari.</p>
          </div>

          {profileLoading && (
            <div className="loading-state"><span className="loading-spinner" /><p>Profil yuklanmoqda...</p></div>
          )}

          {!profileLoading && profile && (
            <>
              <article className="feature-card profile-card">
                <div className="profile-avatar"><UserRound size={30} /></div>
                <div className="profile-identity">
                  <h2>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Telegram foydalanuvchisi"}</h2>
                  {profile.username ? <p>@{profile.username.replace(/^@/, "")}</p> : <p>Username ko‘rsatilmagan</p>}
                </div>
                <span className="profile-status">Telegram</span>
              </article>

              <article className="settings-card profile-details">
                <h2>Shaxsiy ma’lumotlar</h2>
                <div className="profile-detail-row"><span>Telegram ID</span><strong>{profile.telegram_id ?? "—"}</strong></div>
                <div className="profile-detail-row"><span>Telefon raqami</span><strong>{profile.phone_number || "Bot orqali ulashilmagan"}</strong></div>
                <div className="profile-detail-row"><span>Til</span><strong>{profile.language === "uz_cyr" ? "O‘zbekcha (кирилл)" : profile.language === "ru" ? "Русский" : "O‘zbekcha"}</strong></div>
                {!profileSaved && <p className="small-note">Profil bazada hali saqlanmagan. Botda /start buyrug‘ini bosing va kerak bo‘lsa telefon raqamingizni ulashing.</p>}
              </article>

              <article className="settings-card profile-details">
                <h2>Hudud va namoz vaqtlari</h2>
                <label className="modal-label" htmlFor="profile-city">Shahar yoki hudud</label>
                <select id="profile-city" className="city-select" value={prayerCity} disabled={profileSaving} onChange={(event) => void saveProfileCity(event.target.value)}>
                  {cities.map((city) => <option key={city.value} value={city.value}>{city.label}</option>)}
                </select>
                <p className="small-note">Tanlangan shahar namoz vaqtlari uchun ishlatiladi.</p>
              </article>

              <article className="settings-card profile-details">
                <h2>Eslatmalar</h2>
                <label className="profile-toggle-row">
                  <span><strong>Namoz eslatmalari</strong><small>Namoz vaqtlariga oid eslatmalar</small></span>
                  <input type="checkbox" checked={prayerReminders} disabled={profileSaving} onChange={(event) => void saveReminderSettings(event.target.checked, dailyReminders)} />
                </label>
                <label className="profile-toggle-row">
                  <span><strong>Kundalik eslatmalar</strong><small>Duolar va foydali eslatmalar</small></span>
                  <input type="checkbox" checked={dailyReminders} disabled={profileSaving} onChange={(event) => void saveReminderSettings(prayerReminders, event.target.checked)} />
                </label>
                {profileSaving && <p className="small-note">Saqlanmoqda...</p>}
              </article>
            </>
          )}

          {profileError && <div className="error-state"><p>{profileError}</p><button className="secondary-action" onClick={() => changeTab("home")}>Bosh sahifaga qaytish</button></div>}
          {profileMessage && <p className="small-note profile-success">{profileMessage}</p>}
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

        <button
          className={tab === "profile" ? "active" : ""}
          onClick={() => changeTab("profile")}
        >
          <UserRound size={21} />
          <span>Profil</span>
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
              onChange={(event) => setPrayerCity(event.target.value)}
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
              onChange={(event) => setPrayerCity(event.target.value)}
            >
              {cities.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>

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
