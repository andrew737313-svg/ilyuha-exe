export const SCREENS = [
  { id: "boot", chapter: "01", title: "Запуск", subtitle: "ИЛЮХА.EXE" },
  { id: "profile", chapter: "02", title: "Профиль персонажа", subtitle: "LVL 32" },
  { id: "school", chapter: "03", title: "Два стула, одна парта", subtitle: "Школа" },
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
    text: "Профиль открыт: 32 года, всё ещё свой.",
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
    text: "Уроки подождут. Сейв не подождёт.",
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
    title: "Не удалил сейв с детства",
    text: "Шесть раз «ещё пять минут».",
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
    text: "Линия встала — смена не встала.",
    icon: "factory",
  },
  "shift-all": {
    id: "shift-all",
    title: "Полный разбор смены",
    text: "Паника, разбор и лицо кирпичом. Всё в один день.",
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
    text: "Патч 32.0 установлен. Сейвы переносятся.",
    icon: "heart",
  },
  soundtrack: {
    id: "soundtrack",
    title: "Старый сейв на связи",
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
      "Ты сел ровно, сложил руки на парте и решил побыть примерным. Хоть раз в жизни.",
      "Я посмотрел на тебя как на предателя. Ты сделал вид, что не заметил.",
      "К удивлению обоих, дотерпел ты до звонка. Почти.",
      "Замечание мы получили вдвоём. За что — уже не вспомнить.",
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
      "К концу урока в неё играл уже весь ряд, а учительница делала вид, что всё под контролем.",
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
      "Уроки подождут: дома ждал комп, а в нём — сейв на самом интересном месте.",
      "«Только на полчаса» закончилось затемно. Как всегда.",
      "Мама спрашивала, сделаны ли уроки. Мы хором сказали «да».",
      "Уроки не сделали. Зато прошли то, что не получалось. Не жалею.",
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
      "Ты хватаешь рацию, роняешь рацию, ловишь рацию ногой.",
      "«СТОП-СТОП-СТОП, ВСЁ ВСТАЛО!» — кричишь ты в рацию, которая лежит на полу.",
      "Смена спокойно смотрит на тебя. Инженер подходит, щёлкает один тумблер, линия оживает.",
      "«Всё, — говорит он. — В следующий раз просто позови». Ты киваешь так, будто так и планировал.",
    ],
  },
  {
    id: "fix" as WorkChoiceId,
    label: "Разобраться",
    hint: "Собственно, работа",
    achievement: "shift-senior",
    tone: "good",
    reaction: [
      "Ты смотришь на панель, потом на линию, потом снова на панель. Минус двадцать секунд, плюс спокойные руки.",
      "Датчик уровня врёт: молоко ушло в накопитель, насос встал на защите. Классика.",
      "Ты сбрасываешь защиту, запускаешь насос, проверяешь температуру. Линия идёт, молоко идёт, смена идёт.",
      "Инженер кивает: «Красиво». Ты пожимаешь плечами. Работа как работа.",
    ],
  },
  {
    id: "pretend" as WorkChoiceId,
    label: "Сделать вид, что всё под контролем",
    hint: "Очень уверенно",
    achievement: "shift-senior",
    tone: "chaos",
    reaction: [
      "Ты не двигаешься. Ты просто стоишь и смотришь на линию так, будто это она во всём виновата.",
      "Смена ждёт. Линия ждёт. Молоко ждёт. Ты киваешь сам себе и говоришь: «Ну, в принципе, штатно».",
      "Через сорок секунд линия запускается сама. Ты делаешь вид, что так и задумано.",
      "В журнале смены появляется запись, сделанная твоей рукой: «Штатно». Никто не спорит.",
    ],
  },
];

export const MINIGAME_STEPS = [
  {
    time: "23:40",
    speaker: "Мама",
    quote: "Ну всё, выключай.",
    note: "Голос из коридора. Ты сделал вид, что не расслышал.",
  },
  {
    time: "00:15",
    speaker: "Ты",
    quote: "Ща, сохранюсь.",
    note: "Сохранение занимает полминуты. Проверка, что всё сохранилось, — ещё двадцать.",
  },
  {
    time: "01:02",
    speaker: "Система",
    quote: "Это была уже третья «последняя миссия».",
    note: "Система ведёт статистику. Мама — тоже.",
  },
  {
    time: "02:30",
    speaker: "Система",
    quote: "Сохранение создано.",
    note: "Зато нашлось что-то редкое. Хоть какая-то награда.",
  },
  {
    time: "03:55",
    speaker: "Ты",
    quote: "За окном стемнело. Ты ничего не заметил.",
    note: "И правда: было светло, стало темно, а ты всё ещё на том же уровне.",
  },
  {
    time: "05:10",
    speaker: "Ты",
    quote: "Ну всё. Ещё одну — и точно спать.",
    note: "Утром всё равно вставать. Время ещё есть.",
  },
] as const;

export const PROFILE_STATS = [
  { label: "Имя", value: "Илюха", icon: "star" },
  { label: "Возраст", value: "32", icon: "crown" },
  { label: "Класс", value: "муж, отец, смена на заводе", icon: "factory" },
  { label: "Семейное положение", value: "женат на Диане", icon: "heart" },
  { label: "Дети", value: "двое", icon: "heart" },
  { label: "Слабость", value: "«Ещё одна катка»", icon: "gamepad" },
] as const;

export const PROFILE_BARS = [
  { label: "Совесть", value: 62, tone: "amber" },
  { label: "Сон", value: 23, tone: "rust" },
  { label: "Харизма", value: 91, tone: "mint" },
  { label: "Спокойствие", value: 96, tone: "amber" },
] as const;

export const FINAL_LETTER = [
  "Илюха, с днём рождения!",
  "Мы сидели за одной партой, бегали друг к другу «на полчаса» и всё время что-то придумывали. Половину тех идей уже не вспомнить — а смешно до сих пор.",
  "Теперь у тебя Диана, двое детей, ночная смена и дела, которые нельзя отложить. А тот пацан, с которым можно было придумать что угодно, никуда не делся — просто он стал старше и научился держать себя в руках.",
  "Желаю тебе здоровья, сил, благополучия семьи, поменьше нервов на работе и побольше времени на себя, друзей и любимые игры — хотя бы на те самые «пять минут».",
  "Рад, что столько лет назад мы оказались за одной партой. Пусть впереди будет ещё много историй, над которыми будем смеяться.",
] as const;