/**
 * Real path map for every illustration used by the game.
 * Source of truth: assets/*.png, prepared into public/media/*.webp by
 * tools/prepare_media.py (crop + resize only, never redrawn).
 */
export type ArtAsset = {
  src: string;
  width: number;
  height: number;
  /** CSS object-position focal point (keeps faces inside the crop). */
  focus: string;
  alt: string;
  /** Where it came from, for the in-app credits + report. */
  source: string;
};

const base = import.meta.env.BASE_URL;

export const ART = {
  nightRetro: {
    src: `${base}media/night-room-retro.webp`,
    width: 1200,
    height: 900,
    focus: "50% 45%",
    alt: "Пиксельная ночная игровая комната в ретро-стиле: монитор, стол, тёплый свет лампы.",
    source: "assets/Ночная игровая комната в стиле ретро.png",
  },
  nightCozy: {
    src: `${base}media/night-room-cozy.webp`,
    width: 1200,
    height: 800,
    focus: "50% 50%",
    alt: "Уютная пиксельная комната ночью: компьютер, полки, свет экрана.",
    source: "assets/Ночная пиксельная игровая уютная комната.png",
  },
  classroom: {
    src: `${base}media/classroom.webp`,
    width: 1200,
    height: 900,
    focus: "42% 33%",
    alt: "Пиксельные одноклассники за партами в солнечном классе.",
    source: "assets/Пиксельные одноклассники в солнечном классе.png",
  },
  park: {
    src: `${base}media/park-friends.webp`,
    width: 1200,
    height: 900,
    focus: "47% 32%",
    alt: "Пиксельная фотография двух друзей в парке.",
    source: "assets/Ретро-фотография в пиксельном парке.png",
  },
  familyPortrait: {
    src: `${base}media/family-portrait.webp`,
    width: 1200,
    height: 800,
    focus: "45% 40%",
    alt: "Тёплый пиксельный семейный портрет: Илюха, Диана и дети.",
    source: "assets/Тёплый семейный портрет в пиксель-арте(2).png",
  },
  gamer: {
    src: `${base}media/gamer-full.webp`,
    width: 1200,
    height: 1200,
    focus: "48% 38%",
    alt: "Пиксельный Илюха за компьютером с кружкой в руке.",
    source: "assets/Пиксельный геймер с лисой чашкой.png",
  },
  portrait: {
    src: `${base}media/portrait-ilyuha.webp`,
    width: 702,
    height: 703,
    focus: "50% 43%",
    alt: "Портрет Илюхи: кадр из пиксельной иллюстрации с компьютером и кружкой.",
    source: "assets/Пиксельный геймер с лисой чашкой.png (кадрирование 20–76% × 8–64%)",
  },
} satisfies Record<string, ArtAsset>;

export type ArtKey = keyof typeof ART;