/**
 * End-to-end check of the built game in real Chromium.
 *
 * Run: npm run build && node tools/verify.mjs
 *
 * Walks all eight chapters, exercises every choice, the six-click minigame,
 * the beer buff, the final audio player (play / pause / seek), persistence,
 * and layout overflow at desktop + mobile widths. Saves screenshots to
 * tools/screenshots/ for visual review.
 */
import { chromium } from "playwright";
import { preview } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const shots = path.join(root, "tools", "screenshots");
await mkdir(shots, { recursive: true });

const results = [];
const consoleErrors = [];
const failedRequests = [];

function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function imagesReady(page, timeout = 8000) {
  await page.waitForFunction(
    () => [...document.querySelectorAll("img")].every((i) => i.complete),
    null,
    { timeout },
  );
}

async function auditContrast(page, label) {
  const bad = await page.evaluate(() => {
    const parse = (str) => {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[,/ ]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bgOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0.8) return c;
        n = n.parentElement;
      }
      const body = parse(getComputedStyle(document.body).backgroundColor);
      return body && body.a > 0.8 ? body : { r: 6, g: 10, b: 18, a: 1 };
    };
    const nodes = [
      ...document.querySelectorAll("p, li, span, strong, em, dt, dd, h1, h2, h3, button, label, figcaption"),
    ];
    const out = [];
    for (const el of nodes) {
      const text = (el.childElementCount === 0 ? el.textContent : "").trim();
      if (text.length < 2) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || Number(st.opacity) < 0.6) continue;
      if (el.closest(".toasts, .art__corners, .art__scan")) continue;
      const fg = parse(st.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const l1 = lum(fg);
      const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const size = parseFloat(st.fontSize);
      const bold = Number(st.fontWeight) >= 600;
      const large = size >= 24 || (bold && size >= 18.66);
      const min = large ? 3 : 4.5;
      if (ratio < min) {
        out.push(`${el.className || el.tagName}: ${ratio.toFixed(2)}<${min} "${text.slice(0, 20)}"`);
      }
    }
    return out;
  });
  check(`Контраст текста (${label})`, bad.length === 0, bad.slice(0, 4).join(" | "));
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false });
}

const EXPECTED_404 = /\/audio\/(ilyuha-happy-birthday|old-save)\.(mp3|m4a|ogg)/;

const server = await preview({
  root,
  preview: { port: 4173, strictPort: true, host: "127.0.0.1" },
  logLevel: "warn",
});

const base = "http://127.0.0.1:4173";
const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
  });
  const page = await context.newPage();
  // Мини-игра сама бросает ящики: флаг автоигры для теста.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("ilyuha-stack-auto", "1");
    } catch {
      /* ignore */
    }
  });

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (EXPECTED_404.test(text) || /favicon/i.test(text)) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (EXPECTED_404.test(url)) return;
    if (/\/audio\//.test(url) && /ERR_ABORTED/.test(req.failure()?.errorText ?? '')) return;
    failedRequests.push(`${url} — ${req.failure()?.errorText}`);
  });

  // ------------------------------------------------------------------ boot
  console.log("\n01 · ЗАПУСК");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  const bootTitle = await page.locator("h1").innerText();
  check("Экран запуска отрисован", bootTitle.includes("ИЛЮХА.EXE"), bootTitle);
  check(
    "Подзаголовок на месте",
    (await page.locator(".boot__title-sub").innerText()).includes("Патч 32.0"),
  );
  check(
    "Стартовое изображение загрузилось",
    await page.locator(".boot__art img").evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  await shot(page, "01-boot-idle");

  const fonts = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('12px "ILY-pressstart"', "ИЛЮХА.EXE"),
      document.fonts.load('700 24px "ILY-pixelify"', "Илюха"),
      document.fonts.load('16px "ILY-plexmono"', "Илюха"),
    ]);
    return {
      press: document.fonts.check('12px "ILY-pressstart"', "ИЛЮХА"),
      pixel: document.fonts.check('700 24px "ILY-pixelify"', "Илюха"),
      plex: document.fonts.check('16px "ILY-plexmono"', "Илюха"),
      loaded: [...document.fonts].filter((f) => f.status === "loaded").length,
    };
  });
  check(
    "Самохостинг шрифтов работает",
    fonts.press && fonts.pixel && fonts.plex && fonts.loaded >= 2,
    JSON.stringify(fonts),
  );

  const audioBefore = await page.evaluate(() => window.__ILYUHA_AUDIO__?.debugState() ?? null);
  check("Аудио не создаётся до жеста", audioBefore?.context === "none", JSON.stringify(audioBefore));

  await page.getByRole("button", { name: /запустить систему/i }).click();
  await page.waitForSelector(".boot__log li.is-key", { timeout: 10000 });
  await page.waitForSelector("button:has-text('Открыть профиль персонажа')", { timeout: 10000 });

  const logLines = await page.locator(".boot__log li").allInnerTexts();
  check(
    "Четыре строки загрузки",
    logLines.length === 4 &&
      logLines[0].includes("Проверка жёсткого диска: жив.") &&
      logLines[1].includes("Поиск сохранения") &&
      logLines[2].includes("Проверка взрослости") &&
      logLines[3].includes("Илюха обнаружен"),
    logLines.join(" | "),
  );

  const audioAfter = await page.evaluate(() => window.__ILYUHA_AUDIO__?.debugState() ?? null);
  check(
    "Фоновая музыка запустилась после жеста",
    audioAfter?.context === "running" && audioAfter?.playing === true,
    JSON.stringify(audioAfter),
  );
  await auditContrast(page, "запуск");
  await shot(page, "02-boot-ready");

  // settings dialog: music/sfx toggles, volumes, achievements, persistence
  await page.getByRole("button", { name: /настройки и достижения/i }).click();
  await page.waitForSelector("dialog[open]");
  check(
    "Два отдельных ползунка громкости",
    (await page.locator("dialog[open] input[type=range]").count()) === 2,
  );
  check(
    "Все достижения перечислены в настройках",
    (await page.locator("dialog[open] .ach-list__item").count()) === 13,
  );
  await page.locator("dialog[open] .toggle").first().click();
  await page.waitForTimeout(250);
  const musicOff = await page.evaluate(() => window.__ILYUHA_AUDIO__.debugState());
  check("Музыку можно выключить", musicOff.playing === false && musicOff.musicOn === false, JSON.stringify(musicOff));
  await page.locator("dialog[open] .toggle").first().click();
  await page.waitForTimeout(350);
  const musicOn = await page.evaluate(() => window.__ILYUHA_AUDIO__.debugState());
  check("Музыка включается обратно", musicOn.playing === true);
  check(
    "Луп длится 20–40 секунд",
    musicOn.loopSeconds >= 20 && musicOn.loopSeconds <= 40,
    `${musicOn.loopSeconds} c`,
  );
  await page.locator("dialog[open] input[aria-label='Громкость музыки']").fill("20");
  await page.waitForTimeout(200);
  const vol = await page.evaluate(() => window.__ILYUHA_AUDIO__.debugState());
  check("Ползунок музыки меняет громкость", Math.abs(vol.musicVolume - 0.2) < 0.03, `${vol.musicVolume}`);
  await page.getByRole("button", { name: /закрыть настройки/i }).click();
  await page.waitForTimeout(150);

  // --------------------------------------------------------------- profile
  console.log("\n02 · ПРОФИЛЬ");
  await page.getByRole("button", { name: /открыть профиль/i }).click();
  await page.waitForSelector("h1:has-text('Илюха')");
  const portrait = page.locator(".portrait img");
  check(
    "Портрет загрузился и виден",
    await portrait.evaluate((i) => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width > 160),
  );
  const portraitSrc = await portrait.getAttribute("src");
  check("Портрет — подготовленный кроп из assets", /portrait-ilyuha/.test(portraitSrc), portraitSrc);
  const stats = await page.locator(".stats__row").allInnerTexts();
  const statsText = stats.join(" | ").replace(/\s+/g, " ").toLowerCase();
  check(
    "Все характеристики на месте",
    ["имя", "возраст", "класс", "семейное положение", "дети", "слабость"].every((s) =>
      statsText.includes(s),
    ) && statsText.includes("ну ещё одну и всё"),
    statsText.slice(0, 160),
  );
  check(
    "Пассивная способность «Трудовая мозоль авторитета»",
    await page
      .locator(".perk")
      .innerText()
      .then((t) => t.includes("Трудовая мозоль авторитета") && t.includes("авторитет +15")),
  );
  await auditContrast(page, "профиль");
  await shot(page, "03-profile");

  // ---------------------------------------------------------------- school
  console.log("\n03 · ШКОЛА");
  await page.getByRole("button", { name: /глава 03/i }).click();
  await page.waitForSelector("h1:has-text('Когда-то делили парту')");
  await imagesReady(page);
  check("Школьная иллюстрация загрузилась", await page.locator(".split--story img").evaluate((i) => i.complete && i.naturalWidth > 0));

  const schoolChoices = ["Сидеть спокойно", "Придумать какую-то херь", "Свалить и пойти играть в комп"];
  for (const label of schoolChoices) {
    await page.getByRole("button", { name: new RegExp(label.slice(0, 18), "i") }).click();
    await page.waitForSelector(".reaction");
    const lines = await page.locator(".reaction__lines li").allInnerTexts();
    check(`Реакция на «${label}»`, lines.length >= 3 && lines[0].length > 20, `${lines.length} строк`);
  }
  check("Счётчик «Пробовано: 3/3»", (await page.locator(".panel__note").last().innerText()).includes("3/3"));
  await auditContrast(page, "школа");
  await shot(page, "04-school");

  // -------------------------------------------------------------- minigame
  console.log("\n04 · МИНИ-ИГРА");
  await page.getByRole("button", { name: /глава 04/i }).click();
  await page.waitForSelector("h1:has-text('Погрузи фуру')");
  await imagesReady(page);
  check("Фото ночной сессии загрузилось", await page.locator(".night__art img").evaluate((i) => i.complete && i.naturalWidth > 0));

  check(
    "Правила погрузки показаны до старта",
    (await page.locator(".night__crt").innerText()).toLowerCase().includes("фур"),
  );
  await page.getByRole("button", { name: /начать погрузку/i }).click();
  await page.waitForSelector(".stack__field", { timeout: 5000 });
  await page.waitForSelector(".stack__box--cur", { timeout: 3000 });
  check("Поле и каретка отрисованы", (await page.locator(".stack__bed").count()) === 1);
  check("Кнопка сброса на месте", await page.locator(".stack__drop").isVisible());

  // Автоигра (ilyuha-stack-auto) бросает в идеальный момент — ждём победу или провал.
  let won = false;
  for (let i = 0; i < 600; i += 1) {
    if (await page.locator(".night__verdict:not(.stack__failed)").count()) {
      won = true;
      break;
    }
    const retry = page.locator(".stack__failed .btn");
    if (await retry.count()) await retry.first().click({ timeout: 400 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  check("Фура загружена", won);
  const tally = await page.locator(".night__verdict:not(.stack__failed) .night__tally").innerText();
  check(
    "Итоги смены показаны",
    /ящиков \d+\/\d+ · потеряно \d+ · время \d+:\d{2}/i.test(tally),
    tally,
  );
  check(
    "Звание выдано",
    (await page.locator(".ring__grade").innerText()).includes("СТАРШИЙ"),
  );
  check("Накладная на месте", (await page.locator(".ring__book li").count()) >= 4);
  check("Достижение мини-игры показано", await page.locator(".award-panel").isVisible());
  check(
    "Кнопка «Глава 05» разблокирована",
    !(await page.locator(".nav-row .btn").last().isDisabled()),
  );
  await auditContrast(page, "мини-игра");
  await shot(page, "05-minigame");

  // ---------------------------------------------------------------- family
  console.log("\n05 · СЕМЬЯ");
  await page.getByRole("button", { name: /глава 05/i }).click();
  await page.waitForSelector("h1:has-text('Новая игра+')");
  check(
    "Семейная иллюстрация загрузилась",
    await page
      .locator(".split--family img")
      .evaluate((i) => {
        if (i.complete && i.naturalWidth > 0) return true;
        return new Promise((resolve) => {
          i.addEventListener("load", () => resolve(i.naturalWidth > 0), { once: true });
          i.addEventListener("error", () => resolve(false), { once: true });
          window.setTimeout(() => resolve(i.complete && i.naturalWidth > 0), 8000);
        });
      }),
  );
  const journal = await page.locator(".journal__item").allInnerTexts();
  check(
    "Три записи: Диана, Маргарита, Богдан",
    journal.length === 3 &&
      journal.join(" ").includes("Диана") &&
      journal.join(" ").includes("Маргарита") &&
      journal.join(" ").includes("Богдан"),
    `${journal.length}`,
  );
  const familyText = await page.locator(".family-panel").innerText();
  check(
    "Факты из сценария (школа Маргариты, полгода Богдану)",
    /пошла в школу/i.test(familyText) && /полгода/i.test(familyText),
    familyText.slice(0, 120),
  );
  await auditContrast(page, "семья");
  await shot(page, "06-family");

  // ------------------------------------------------------------------ work
  console.log("\n06 · РАБОТА");
  await page.getByRole("button", { name: /глава 06/i }).click();
  await page.waitForSelector("h1:has-text('Ночная смена')");
  check("Сцена завода отрисована", (await page.locator("svg.factory").count()) === 1);
  check("Аварийный статус виден", await page.locator(".work__alert").isVisible());

  for (const label of ["Паниковать", "Разобраться", "Сделать вид"]) {
    await page.getByRole("button", { name: new RegExp(label, "i") }).first().click();
    await page.waitForSelector(".reaction--inline");
    const lines = await page.locator(".reaction__lines li").allInnerTexts();
    check(`Решение «${label}» имеет реакцию`, lines.length >= 3, `${lines.length} строк`);
  }
  await auditContrast(page, "работа");
  await shot(page, "07-work");

  // ----------------------------------------------------------------- patch
  console.log("\n07 · ПАТЧ 32.0");
  await page.getByRole("button", { name: /глава 07/i }).click();
  await page.waitForSelector("h1:has-text('Пивной баф')");
  await imagesReady(page);
  check("Чейнджлог отрисован", (await page.locator(".changelog li").count()) >= 3);
  check(
    "Иллюстрация в патче загрузилась",
    await page.locator(".patch__art img").evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  check(
    "Финал заблокирован до бафа",
    await page.getByRole("button", { name: /сначала активируй баф/i }).isDisabled(),
  );
  await page.getByRole("button", { name: /получить пивной баф/i }).click();
  await page.waitForSelector(".buff-on");
  check("Баф активирован и показан", (await page.locator(".buff-on").innerText()).includes("БАФ АКТИВЕН"));
  check("Штамп бафа на иллюстрации", await page.locator(".patch__stamp").isVisible());
  check(
    "Переход к финалу разблокирован",
    !(await page.getByRole("button", { name: /финал: старый сейв/i }).isDisabled()),
  );
  await auditContrast(page, "патч");
  await shot(page, "08-patch");

  // ----------------------------------------------------------------- final
  console.log("\n08 · ФИНАЛ");
  await page.getByRole("button", { name: /финал: старый сейв/i }).click();
  await page.waitForSelector("h1:has-text('Та же книга')");
  await imagesReady(page);
  check("Фото друзей загрузилось", await page.locator(".final__hero img").evaluate((i) => i.complete && i.naturalWidth > 0));
  const upscaled = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((i) => i.getBoundingClientRect().width > i.naturalWidth + 2)
      .map((i) => `${i.currentSrc.split("/").pop()}:${Math.round(i.getBoundingClientRect().width)}>${i.naturalWidth}`),
  );
  check("Пиксель-арт не растянут сверх оригинала", upscaled.length === 0, upscaled.join(", "));
  const letter = await page.locator(".letter").innerText();
  check(
    "Письмо содержит ключевые абзацы",
    /с днём рождения/i.test(letter) && /одной партой/i.test(letter) && /обнял, приподнял/i.test(letter),
  );
  const playerTitle = await page.locator(".player__title").innerText();
  const playerBadge = await page.locator(".player__badge").first().innerText();
  check(
    "Плеер нашёл трек из сборки",
    /Илюха, с днём рождения/i.test(playerTitle) && /из сборки/i.test(playerBadge),
    `${playerTitle} | ${playerBadge}`,
  );

  const play = page.locator(".player__play");
  await play.click();
  await page.waitForTimeout(1200);
  const audioState = await page.evaluate(() => {
    const a = document.querySelector(".player audio");
    return {
      paused: a.paused,
      currentTime: a.currentTime,
      duration: a.duration,
      ducked: window.__ILYUHA_AUDIO__?.debugState().ducked,
      musicPlaying: window.__ILYUHA_AUDIO__?.debugState().playing,
      musicOn: window.__ILYUHA_AUDIO__?.debugState().musicOn,
    };
  });
  check(
    "Трек реально играет",
    audioState.paused === false && audioState.currentTime > 0.3,
    JSON.stringify(audioState),
  );
  check(
    "Фоновая музыка выключена под трек",
    audioState.musicOn === false && audioState.musicPlaying === false,
    JSON.stringify(audioState),
  );
  check("Длительность известна", Number.isFinite(audioState.duration) && audioState.duration > 10, `${audioState.duration}`);

  await play.click();
  await page.waitForTimeout(400);
  const paused = await page.evaluate(() => {
    const a = document.querySelector(".player audio");
    return {
      paused: a.paused,
      ducked: window.__ILYUHA_AUDIO__?.debugState().ducked,
      musicPlaying: window.__ILYUHA_AUDIO__?.debugState().playing,
      musicOn: window.__ILYUHA_AUDIO__?.debugState().musicOn,
    };
  });
  check("Пауза работает", paused.paused === true);
  check(
    "Фоновая музыка возвращается на паузе",
    paused.musicOn === true && paused.musicPlaying === true,
    JSON.stringify(paused),
  );

  const seeked = await page.evaluate(async () => {
    const a = document.querySelector(".player audio");
    const input = document.querySelector(".player__timeline input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "12");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    return { currentTime: a.currentTime, shown: input.value };
  });
  check("Перемотка меняет позицию трека", Math.abs(seeked.currentTime - 12) < 1.5, JSON.stringify(seeked));

  const achCount = await page.locator(".final__achievements li").count();
  check("Достижения выведены в финале", achCount >= 9, `${achCount} шт.`);
  await auditContrast(page, "финал");
  await shot(page, "09-final");

  // persistence
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check(
    "Прогресс сохранился после перезагрузки",
    (await page.locator("h1").innerText()).includes("Та же книга"),
  );
  const savedAudio = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("ilyuha-exe-audio-v1") ?? "{}"),
  );
  check("Громкость сохраняется между сессиями", Math.abs((savedAudio.musicVolume ?? 1) - 0.2) < 0.03, JSON.stringify(savedAudio));

  // ------------------------------------------------------------ mobile pass
  console.log("\nМОБИЛЬНАЯ ВЁРСТКА");
  await page.setViewportSize({ width: 390, height: 844 });
  // Walk backwards through the HUD map from final to boot.
  for (let i = 8; i >= 1; i -= 1) {
    const pip = page.locator(".hud__pip").nth(i - 1);
    if (await pip.isDisabled()) continue;
    await pip.click();
    await page.waitForTimeout(180);
    await imagesReady(page, 5000).catch(() => {});
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
      name: document.querySelector("h1")?.innerText?.slice(0, 30),
    }));
    check(
      `Нет горизонтальной прокрутки (${overflow.name})`,
      overflow.scroll <= overflow.inner + 1,
      `${overflow.scroll} / ${overflow.inner}`,
    );
    const imagesOk = await page.evaluate(() =>
      [...document.querySelectorAll("img")].every((i) => i.complete && i.naturalWidth > 0),
    );
    check(`Все изображения загрузились (${overflow.name})`, imagesOk);

    const layout = await page.evaluate(() => {
      const hud = document.querySelector(".hud")?.getBoundingClientRect();
      const head = document.querySelector(".chapter__head")?.getBoundingClientRect();
      const clipped = [
        ...document.querySelectorAll(
          ".chapter__title, .btn__label, .choice__label, .stats__row dd, .letter p, .night__text, .chapter__kicker, .boot__title-main",
        ),
      ]
        .filter((el) => {
          const style = getComputedStyle(el);
          return style.overflow === "visible" && el.scrollWidth > el.clientWidth + 2;
        })
        .map((el) => `${el.className}:${el.textContent?.slice(0, 24)}`);
      return { overlap: hud && head ? head.top < hud.bottom - 2 : false, clipped };
    });
    check(`HUD не перекрывает заголовок (${overflow.name})`, !layout.overlap);
    check(
      `Текст не обрезан (${overflow.name})`,
      layout.clipped.length === 0,
      layout.clipped.slice(0, 3).join(" | "),
    );
  }
  await page.locator(".hud__pip").nth(7).click();
  await page.waitForTimeout(250);
  await shot(page, "10-mobile-final");

  // narrowest common phone width
  await page.setViewportSize({ width: 320, height: 720 });
  for (let i = 8; i >= 1; i -= 1) {
    const pip = page.locator(".hud__pip").nth(i - 1);
    if (await pip.isDisabled()) continue;
    await pip.click();
    await page.waitForTimeout(150);
    const w = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
      name: document.querySelector("h1")?.innerText?.slice(0, 18),
    }));
    check(`Нет горизонтальной прокрутки на 320px (${w.name})`, w.scroll <= w.inner + 1, `${w.scroll} / ${w.inner}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".hud__pip").nth(1).click();
  await page.waitForTimeout(200);

  // tappable targets
  await page.locator(".hud__pip").nth(1).click();
  await page.waitForTimeout(200);
  const smallTargets = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("button, a, input")];
    return nodes
      .filter((n) => {
        const r = n.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        return r.width < 32 || r.height < 32;
      })
      .map((n) => `${n.tagName}:${n.getAttribute("aria-label") ?? n.textContent?.slice(0, 20)}`);
  });
  check("Мелких кликабельных целей нет", smallTargets.length === 0, smallTargets.slice(0, 6).join(", "));

  // --------------------------------------------------------- reduced motion
  const rmContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(base, { waitUntil: "domcontentloaded" });
  const anim = await rmPage.locator(".stage__inner").evaluate((el) => getComputedStyle(el).animationDuration);
  check("prefers-reduced-motion уважается", parseFloat(anim) < 0.01, anim);
  await rmContext.close();

  // --------------------------------------------------------------- summary
  const media = await page.evaluate(() =>
    [...document.querySelectorAll("img")].map((i) => `${i.currentSrc.split("/").pop()}:${i.naturalWidth}x${i.naturalHeight}`),
  );
  check("Изображения отдают натуральные размеры", media.length > 0, media.join(", "));

  check("Нет ошибок в консоли", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" || "));
  check("Нет упавших запросов", failedRequests.length === 0, failedRequests.slice(0, 3).join(" || "));

  await context.close();
} catch (error) {
  console.error("\nCRASH:", error);
  results.push({ name: "Прогон сценария завершился", ok: false, detail: String(error) });
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

const failures = results.filter((r) => !r.ok);
console.log(
  `\n${"=".repeat(60)}\nИТОГО: ${results.length - failures.length}/${results.length} проверок пройдено`,
);
if (failures.length) {
  console.log("ПРОВАЛЫ:");
  for (const f of failures) console.log(` - ${f.name} ${f.detail ? `(${f.detail})` : ""}`);
}
await writeFile(
  path.join(root, "tools", "verify-report.json"),
  JSON.stringify({ results, consoleErrors, failedRequests }, null, 2),
  "utf8",
);
process.exit(failures.length ? 1 : 0);