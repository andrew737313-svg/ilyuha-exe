export const SCREENS = [
  { id: "boot", chapter: "01", title: "Запуск", subtitle: "ИЛЮХА.EXE" },
  { id: "profile", chapter: "02", title: "Профиль персонажа", subtitle: "LVL 32" },
  { id: "school", chapter: "03", title: "Одна парта на двоих", subtitle: "Школа" },
  { id: "minigame", chapter: "04", title: "Поставь на звонок", subtitle: "Сименс · 2005" },
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
    title: "Поставил на звонок",
    text: "WAV-песенка сыграна до конца. 2005-й одобряет.",
    icon: "note",
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

/** Мини-игра «Поставь на звонок» — ритм-игра на сименсе. */
export const RINGTONE = {
  bpm: 92,
  /** Пауза перед первой нотой, сек. */
  leadIn: 1.6,
  title: "ПИЛИКАЮЩАЯ №2",
  /** Мелодия: [доля, midi]. Низкие ноты — левая линия, высокие — правая. */
  notes: [
    [0, 69], [1, 72], [2, 74], [3, 76],
    [4, 79], [4.5, 76], [5, 74], [6, 72], [7, 74],
    [8, 76], [9, 76], [10, 79], [10.5, 79], [11, 81],
    [12, 79], [13, 76], [14, 74], [15, 72],
    [16, 69], [16.5, 72], [17, 74], [18, 76], [19, 76],
    [20, 74], [20.5, 74], [21, 72], [22, 74], [23, 69],
    [24, 72], [25, 74], [26, 76], [27, 79],
    [28, 81], [28.5, 79], [29, 76], [30, 74], [31, 72],
    [32, 74], [33, 76], [34, 74], [35, 72],
    [36, 69],
  ] as ReadonlyArray<readonly [number, number]>,
  /** Записная книжка в боковой панели. */
  phonebook: [
    { name: "Мама", note: "14 пропущенных" },
    { name: "Художка", note: "до утра открыты, заходи" },
    { name: "Пацаны", note: "го в кску, места есть" },
    { name: "Дом", note: "ужин остыл, сам разогрей" },
  ] as const,
  /** Оценки по точности (hits/notes), от лучшей к худшей. */
  grades: [
    { min: 0.85, name: "ЗВЕЗДА ДВОРА", text: "Мелодия на звонке. Прохожие оборачиваются." },
    { min: 0.6, name: "СИМЕНС ДОВОЛЕН", text: "Пара нот мимо — так даже живее." },
    { min: 0.35, name: "ПОЧТИ ПЕСНЯ", text: "Сименс промолчал. Из вежливости." },
    { min: 0, name: "БЕЗЗВУЧНЫЙ РЕЖИМ", text: "Ладно. Оставь стандартную «Пиликающую №3»." },
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