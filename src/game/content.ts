export const SCREENS = [
  { id: "boot", chapter: "01", title: "Запуск", subtitle: "ИЛЮХА.EXE" },
  { id: "profile", chapter: "02", title: "Профиль", subtitle: "LVL 32" },
  { id: "school", chapter: "03", title: "Одна парта на двоих", subtitle: "школа" },
  { id: "minigame", chapter: "04", title: "Погрузи фуру", subtitle: "склад" },
  { id: "family", chapter: "05", title: "Новая игра+", subtitle: "семья" },
  { id: "work", chapter: "06", title: "Ночная смена", subtitle: "завод" },
  { id: "patch", chapter: "07", title: "Пивной баф", subtitle: "патч 32.0" },
  { id: "final", chapter: "08", title: "Старый сейв, новая глава", subtitle: "финал" },
] as const;

export type ScreenId = (typeof SCREENS)[number]["id"];

export const SCREEN_INDEX: Record<ScreenId, number> = SCREENS.reduce(
  (acc, screen, index) => ({ ...acc, [screen.id]: index }),
  {} as Record<ScreenId, number>,
);

export type AchievementId =
  | "power-on"
  | "identified"
  | "class-clown"
  | "class-good"
  | "class-games"
  | "class-all"
  | "save-childhood"
  | "new-game-plus"
  | "shift-senior"
  | "shift-all"
  | "beer-buff"
  | "old-save"
  | "soundtrack";

export type Achievement = {
  id: AchievementId;
  title: string;
  text: string;
  icon: "disk" | "star" | "gamepad" | "heart" | "trophy" | "beer" | "factory" | "note" | "crown";
};

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  "power-on": {
    id: "power-on",
    title: "Система загружена",
    text: "Диск жив, сохранение «Детство» на месте.",
    icon: "disk",
  },
  identified: {
    id: "identified",
    title: "Опознан",
    text: "Профиль открыт: 32 года, всё ещё заводной.",
    icon: "star",
  },
  "class-good": {
    id: "class-good",
    title: "Спокойный урок",
    text: "Продержался дольше, чем сам ожидал.",
    icon: "crown",
  },
  "class-clown": {
    id: "class-clown",
    title: "Генератор фигни",
    text: "Придумал, сказал, сработало. Учительница не оценила.",
    icon: "gamepad",
  },
  "class-games": {
    id: "class-games",
    title: "Сначала «Художка»",
    text: "Уроки подождут. Клуб — нет.",
    icon: "gamepad",
  },
  "class-all": {
    id: "class-all",
    title: "Три из трёх",
    text: "Школа пройдена во всех трёх вариантах. В дневник ничего не попало.",
    icon: "trophy",
  },
  "save-childhood": {
    id: "save-childhood",
    title: "Фура ушла полной",
    text: "Двенадцать ящиков. Погрузка без крана.",
    icon: "factory",
  },
  "new-game-plus": {
    id: "new-game-plus",
    title: "Новая игра+",
    text: "Сложность выше. Диана, Маргарита и младший.",
    icon: "heart",
  },
  "shift-senior": {
    id: "shift-senior",
    title: "Смена сдана",
    text: "Кефиры целы, фура уехала, ты пошёл спать.",
    icon: "factory",
  },
  "shift-all": {
    id: "shift-all",
    title: "Полный разбор смены",
    text: "Паника, разбор и лицо «всё штатно». В одну ночь.",
    icon: "trophy",
  },
  "beer-buff": {
    id: "beer-buff",
    title: "Пивной баф",
    text: "Уверенность +5, скорость −2. Снимается только силой воли.",
    icon: "beer",
  },
  "old-save": {
    id: "old-save",
    title: "Старый сейв, новая глава",
    text: "Патч 32.0 встал и ничего не сломал.",
    icon: "heart",
  },
  soundtrack: {
    id: "soundtrack",
    title: "Старый трек на связи",
    text: "Финальный трек запущен. Слушай до конца.",
    icon: "note",
  },
};

export type SchoolChoiceId = "good" | "trouble" | "games";
export type WorkChoiceId = "panic" | "fix" | "pretend";

export type Choice = {
  id: string;
  label: string;
  hint?: string;
  reaction: string[];
  achievement: AchievementId;
  tone?: "good" | "chaos" | "game";
};

export const SCHOOL_CHOICES = [
  {
    id: "good" as SchoolChoiceId,
    label: "Сидеть спокойно",
    hint: "Попробовать хотя бы раз",
    achievement: "class-good",
    tone: "good",
    reaction: [
      "Ты сел ровно и минут пятнадцать честно слушал.",
      "Потом я шепнул тебе какую-то фигню, и всё поехало: ржали вдвоём.",
      "«Вам смешно?!» — спросила учительница. Смешно. Очень.",
      "Замечание получили оба. Но ты честно пытался, это зачтено.",
    ],
  },
  {
    id: "trouble" as SchoolChoiceId,
    label: "Придумать какую-нибудь фигню",
    hint: "Классика жанра",
    achievement: "class-clown",
    tone: "chaos",
    reaction: [
      "Мы придумали новую игру. Правила менялись по ходу дела, так честнее.",
      "К концу урока ржал весь ряд, а учительница делала вид, что всё под контролем.",
      "Потом нас попросили выйти и подумать. Мы вышли и придумали ещё две игры.",
      "Правила забылись, смех нет.",
    ],
  },
  {
    id: "games" as SchoolChoiceId,
    label: "Пойти играть в комп",
    hint: "Как обычно",
    achievement: "class-games",
    tone: "game",
    reaction: [
      "После уроков домой мы шли не всегда. Часто сразу в «Художку».",
      "Пиво, ягуар, кска, дота. Иногда оставались до утра.",
      "Утром жалели. Вечером шли снова.",
      "Уроки там не делали. Зато прошли много чего другого.",
    ],
  },
];

export const WORK_CHOICES = [
  {
    id: "panic" as WorkChoiceId,
    label: "Паниковать",
    hint: "Классическая реакция",
    achievement: "shift-senior",
    tone: "chaos",
    reaction: [
      "Ночная смена, линия встала, и ты первым делом гаркнул на весь цех.",
      "Обежал всё по кругу: кефиры, сметана, молоко, газели, фуры.",
      "Искали всем цехом. Нашли там, где никто не догадался посмотреть.",
      "К утру всё уехало. Ты потом неделю рассказывал, как было страшно.",
    ],
  },
  {
    id: "fix" as WorkChoiceId,
    label: "Разобраться",
    hint: "Собственно, работа",
    achievement: "shift-senior",
    tone: "good",
    reaction: [
      "Спокойно, по цепочке: где встало, почему, кто рядом и что делать.",
      "Молочка поехала, фуры загрузились, газели разъехались.",
      "Смена выдохнула. Ты выдохнул последним: старшему так положено.",
      "Дальше обычная ночь.",
    ],
  },
  {
    id: "pretend" as WorkChoiceId,
    label: "Сделать вид, что всё под контролем",
    hint: "Очень уверенно",
    achievement: "shift-senior",
    tone: "chaos",
    reaction: [
      "Ты даже не повернулся: сидел за компом, как будто так и надо.",
      "Смена глянула на тебя и успокоилась: старший спокоен, значит штатно.",
      "Всё и правда встало на место. Минус немного сметаны, но кто её считает.",
      "Утром сдал смену и пошёл спать. По лицу никто ничего не понял.",
    ],
  },
];

/** Мини-игра «Погрузи фуру» — стакер на ночном складе. */
export const STACKER = {
  /** Сколько ящиков нужно, чтобы фура уехала. */
  goal: 12,
  lives: 3,
  /** Скорость каретки, % ширины поля в секунду; растёт с каждым ящиком. */
  baseSpeed: 55,
  speedStep: 4,
  maxSpeed: 110,
  products: ["КЕФИР", "МОЛОКО", "СМЕТАНА"] as const,
  /** Накладная в боковой панели. */
  invoice: [
    { name: "Кефир", note: "4 ящика, не трясти" },
    { name: "Молоко", note: "5 ящиков, сегодняшнее" },
    { name: "Сметана", note: "3 ящика. была" },
    { name: "Фура", note: "уходит в 07:00" },
  ] as const,
} as const;

export const PROFILE_STATS = [
  { label: "Имя", value: "Илюха", icon: "star" },
  { label: "Возраст", value: "32", icon: "crown" },
  { label: "Класс", value: "старший ночной смены", icon: "factory" },
  { label: "Семейное положение", value: "женат на Диане", icon: "heart" },
  { label: "Дети", value: "Маргарита и младший", icon: "heart" },
  { label: "Слабость", value: "«Ну ещё одну и всё»", icon: "gamepad" },
] as const;

/**
 * Полоски профиля: ресурсы и привычки, не оценка человека.
 * Вверху комплимент, ниже подколы. Сумма шутит сама.
 */
export const PROFILE_BARS = [
  {
    label: "Харизма",
    value: 91,
    tone: "mint",
    note: "Договориться можно почти с кем угодно.",
  },
  {
    label: "Тормоза",
    value: 62,
    tone: "amber",
    note: "Стоп-кран есть. Пользуюсь через раз.",
  },
  {
    label: "Нервы",
    value: 38,
    tone: "amber",
    note: "Фура орёт, я киваю.",
  },
  {
    label: "Сон",
    value: 23,
    tone: "rust",
    note: "Спать пойду. Сразу после ещё пяти минут.",
  },
] as const;

export const PROFILE_BARS_NOTE = "214 из 400. Стабильно. Живём.";

export const FINAL_LETTER = [
  "Илюха, с днём рождения!",
  "Мы сидели за одной партой: фишки, суефа, ржач на уроках, драки бывало. Ягуар и одни и те же wav-песенки на сименсах. Потом общага, «Художка» с кской и дотой, Балашиха и кондитерская фабрика. И матрас, который вроде потушили, а он всё равно сгорел.",
  "Теперь ты старший смены: сметана, кефиры, фуры. Дома Диана, Маргарита и младший. Ночью всё так же за компом, только теперь между погрузками.",
  "Желаю здоровья, спокойных смен и поменьше нервов. И времени на себя: пиво, игрушки и «ещё пять минут».",
  "Рад, что нас тогда посадили за одну парту. Истории, которые нельзя рассказывать, оставим до встречи.",
] as const;