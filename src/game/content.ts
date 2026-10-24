export const SCREENS = [
  { id: "boot", chapter: "01", title: "Запуск", subtitle: "ИЛЮХА.EXE" },
  { id: "profile", chapter: "02", title: "Профиль персонажа", subtitle: "LVL 32" },
  { id: "school", chapter: "03", title: "Одна парта на двоих", subtitle: "Школа" },
  { id: "minigame", chapter: "04", title: "Ещё пять минут", subtitle: "Ночная сессия" },
  { id: "family", chapter: "05", title: "Новая игра+", subtitle: "Семья" },
  { id: "work", chapter: "06", title: "Ночная смена", subtitle: "Молочный завод" },
  { id: "patch", chapter: "07", title: "Патч 32.0", subtitle: "Пивной баф" },
  { id: "final", chapter: "08", title: "Старый сейв, новая глава", subtitle: "Финал" },
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
    text: "Жёсткий диск жив. Сохранение «Детство» на месте.",
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
    text: "Придумал. Сработало. Учительница не оценила.",
    icon: "gamepad",
  },
  "class-games": {
    id: "class-games",
    title: "Сначала катка",
    text: "Уроки подождут. «Художка» — нет.",
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
    title: "Не выключал до утра",
    text: "«Ещё пять минут» повторялись до семи утра. Смена всё равно сдана.",
    icon: "disk",
  },
  "new-game-plus": {
    id: "new-game-plus",
    title: "Новая игра+",
    text: "Сложность выше. Диана, Маргарита и младший.",
    icon: "heart",
  },
  "shift-senior": {
    id: "shift-senior",
    title: "Ночная смена",
    text: "Смена прошла, кефиры целы.",
    icon: "factory",
  },
  "shift-all": {
    id: "shift-all",
    title: "Полный разбор смены",
    text: "Паника, разбор и вид «всё штатно». Всё в одну смену.",
    icon: "trophy",
  },
  "beer-buff": {
    id: "beer-buff",
    title: "Пивной баф",
    text: "Баф активен. Скорость −2, уверенность +5.",
    icon: "beer",
  },
  "old-save": {
    id: "old-save",
    title: "Старый сейв, новая глава",
    text: "Патч 32.0 установлен. Всё лучшее — с собой.",
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
      "Ты сел ровно и минут пятнадцать честно пытался слушать.",
      "Потом я шепнул тебе какую-то фигню — и всё, мы уже ржали вдвоём.",
      "«Вам смешно?!» — спросила учительница. Смешно. Очень.",
      "Замечание получили оба. Но ты честно пытался — уже зачтено.",
    ],
  },
  {
    id: "trouble" as SchoolChoiceId,
    label: "Придумать какую-нибудь фигню",
    hint: "Классика жанра",
    achievement: "class-clown",
    tone: "chaos",
    reaction: [
      "Мы придумали новую игру. Правила менялись по ходу дела — так честнее.",
      "К концу урока ржал уже весь ряд, а учительница делала вид, что всё под контролем.",
      "Потом нас всё-таки попросили выйти и подумать. Мы вышли и придумали ещё две игры.",
      "Правила забылись. Смех — нет.",
    ],
  },
  {
    id: "games" as SchoolChoiceId,
    label: "Пойти играть в комп",
    hint: "Как обычно",
    achievement: "class-games",
    tone: "game",
    reaction: [
      "После уроков домой мы шли не всегда. Иногда — сразу в компьютерный клуб «Художка».",
      "Набирали пива и ягуара, резались в кску и доту. Оставались на ночь.",
      "Утром, конечно, жалели. Вечером шли снова.",
      "Уроки мы там точно не делали. Зато проходили совсем другое.",
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
      "Ночная смена, что-то встало, и ты первым делом гаркнул на весь цех.",
      "Обежал всё по кругу: кефиры, сметана, молоко, газели, фуры. Два круга.",
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
      "Смена выдохнула. Ты выдохнул последним — старшему положено.",
      "Дальше — обычная ночь.",
    ],
  },
  {
    id: "pretend" as WorkChoiceId,
    label: "Сделать вид, что всё под контролем",
    hint: "Очень уверенно",
    achievement: "shift-senior",
    tone: "chaos",
    reaction: [
      "Ты даже не повернулся: сидел за компом, как ни в чём не бывало.",
      "Смена глянула на тебя и успокоилась: старший спокоен — значит, штатно.",
      "Всё и правда встало на место. Минус немного сметаны, но кто её считает.",
      "Утром сдал смену и пошёл спать. По лицу никто ничего не понял.",
    ],
  },
];

/** Контент ночной смены — мини-игры «Ещё пять минут». */
export const NIGHT_SHIFT = {
  /** Длительность смены в игровых секундах (реальных при скорости 1). */
  duration: 90,
  /** 23:00 — 07:00. */
  startHour: 23,
  minutes: 480,
  /** Заявки на отгрузку. */
  vehicles: ["ГАЗЕЛЬ", "ФУРА"] as const,
  products: [
    { label: "КЕФИР", log: "кефир" },
    { label: "СМЕТАНА", log: "сметана" },
    { label: "МОЛОКО", log: "молоко" },
  ] as const,
  /** Итоговые реплики (level подставляется динамически). */
  verdicts: {
    perfect: "Уровень пройден, смена сдана. Легенда цеха.",
    level: "Уровень пройден, молочка местами встала. Приоритеты, Илюха.",
    shift: "Кефиры целы. Уровень — на {level}%. Тоже вариант.",
    nothing: "Смена встала, уровень не пошёл. Ночь, честно говоря, так себе.",
  },
} as const;

export const PROFILE_STATS = [
  { label: "Имя", value: "Илюха", icon: "star" },
  { label: "Возраст", value: "32", icon: "crown" },
  { label: "Класс", value: "старший ночной смены", icon: "factory" },
  { label: "Семейное положение", value: "женат на Диане", icon: "heart" },
  { label: "Дети", value: "Маргарита и младший", icon: "heart" },
  { label: "Слабость", value: "«Ну ещё одну и всё»", icon: "gamepad" },
] as const;

export const PROFILE_BARS = [
  { label: "Совесть", value: 62, tone: "amber" },
  { label: "Сон", value: 23, tone: "rust" },
  { label: "Харизма", value: 91, tone: "mint" },
  { label: "Спокойствие", value: 38, tone: "amber" },
] as const;

export const FINAL_LETTER = [
  "Илюха, с днём рождения!",
  "Мы с тобой просидели за одной партой: фишки, суефа, ржач, драки, ягуар и одни и те же wav-песенки на сименсах. Были общага, «Художка» с кской и дотой, Балашиха и кондитерская фабрика. И матрас, который вроде потушили, а он всё равно сгорел.",
  "Теперь ты старший смены: сметана, кефиры, фуры. Дома Диана, Маргарита и младший. Ночами всё так же за компом — просто теперь между погрузками.",
  "Желаю здоровья, спокойных смен, поменьше нервов. И времени на себя — на пиво, игрушки и «ещё пять минут».",
  "Рад, что нас тогда посадили за одну парту. А истории, которые нельзя рассказывать, оставим до встречи.",
] as const;