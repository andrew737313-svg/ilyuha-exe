/**
 * Typography audit: verifies which font actually renders each string, that no
 * negative tracking sneaks in, that Cyrillic is covered by the loaded subset,
 * and that neighbouring letters do not touch (ink-run analysis on a canvas).
 *
 * Run: node tools/typo-check.mjs
 */
import { chromium } from "playwright";
import { preview } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const shots = path.join(root, "tools", "screenshots");
await mkdir(shots, { recursive: true });

const results = [];
let ink = null;
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
};

const STATE = {
  version: 1,
  screen: "final",
  reached: ["boot", "profile", "school", "minigame", "family", "work", "patch", "final"],
  visited: ["boot", "profile", "school", "minigame", "family", "work", "patch", "final"],
  schoolChoice: "good",
  schoolTried: ["good", "trouble", "games"],
  workChoice: "fix",
  workTried: ["panic", "fix", "pretend"],
  clicks: 6,
  beerBuff: true,
  achievements: [
    "power-on", "identified", "class-good", "class-clown", "class-games", "class-all",
    "save-childhood", "new-game-plus", "shift-senior", "shift-all", "beer-buff", "old-save", "soundtrack",
  ],
  trackPlayed: true,
  finished: true,
};

const server = await preview({
  root,
  preview: { port: 4176, strictPort: true, host: "127.0.0.1" },
  logLevel: "error",
});
const base = "http://127.0.0.1:4176";
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript((state) => {
    window.localStorage.setItem("ilyuha-exe-patch32-v1", JSON.stringify(state));
  }, STATE);
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");

  // ---------------------------------------------------------------- fonts
  const fonts = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('800 48px "ILY-rubik"', "Старый сейв"),
      document.fonts.load('600 20px "ILY-rubik"', "Илюха"),
      document.fonts.load('400 16px "ILY-plexsans"', "Илюха"),
      document.fonts.load('600 10px "ILY-plexmono"', "ФИНАЛ"),
      document.fonts.load('400 10px "ILY-pressstart"', "08"),
    ]);
    return {
      cyrRubik: document.fonts.check('800 48px "ILY-rubik"', "Старый сейв, новая глава"),
      cyrSans: document.fonts.check('400 16px "ILY-plexsans"', "Патч установлен"),
      cyrMono: document.fonts.check('600 10px "ILY-plexmono"', "ФИНАЛ · СТАРЫЙ СЕЙВ"),
      digits: document.fonts.check('400 10px "ILY-pressstart"', "08"),
      families: [...new Set([...document.fonts].map((f) => f.family))].sort(),
    };
  });
  check("Rubik покрывает кириллицу заголовка", fonts.cyrRubik);
  check("IBM Plex Sans покрывает кириллицу текста", fonts.cyrSans);
  check("IBM Plex Mono покрывает кириллицу подписей", fonts.cyrMono);
  check("Press Start 2P оставлен только для цифр", fonts.digits);
  check(
    "Загружены ровно четыре семейства",
    fonts.families.map((f) => f.replace(/"/g, "")).join(",") === "ILY-plexmono,ILY-plexsans,ILY-pressstart,ILY-rubik",
    fonts.families.join(", "),
  );

  // ----------------------------------------------------------------- styles
  const styleOf = (selector) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const st = getComputedStyle(el);
      return {
        family: st.fontFamily,
        size: st.fontSize,
        weight: st.fontWeight,
        spacing: st.letterSpacing,
        height: st.lineHeight,
        text: el.innerText?.slice(0, 60),
        clipped: el.scrollWidth > el.clientWidth + 2 && st.overflow === "visible",
      };
    }, selector);

  const expectations = [
    [".chapter__title", "ILY-rubik", "800"],
    [".chapter__kicker", "ILY-plexmono", "600"],
    [".letter__hello", "ILY-rubik", "800"],
    [".letter p:not(.letter__hello)", "ILY-plexsans", "400"],
    [".letter__sign", "ILY-rubik", "700"],
    [".chapter__no", "ILY-pressstart", "400"],
    [".player__title", "ILY-rubik", "800"],
    [".nav-row .btn", "ILY-rubik", "700"],
    [".hud__logo", "ILY-rubik", "800"],
    [".hud__pip", "ILY-pressstart", "400"],
    [".hud__patch", "ILY-plexmono", "500"],
  ];
  for (const [sel, family, weight] of expectations) {
    const st = await styleOf(sel);
    check(
      `${sel} → ${family} ${weight}`,
      st && st.family.includes(family) && st.weight === weight,
      st ? `${st.family.split(",")[0]} ${st.weight} ${st.size} ls=${st.spacing}` : "нет элемента",
    );
  }

  const negative = await page.evaluate(() =>
    [...document.querySelectorAll("*")]
      .filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
      .map((el) => ({ el, ls: parseFloat(getComputedStyle(el).letterSpacing) || 0 }))
      .filter((x) => x.ls < 0)
      .map((x) => `${x.el.className || x.el.tagName}: ${x.ls}px`),
  );
  check("Нигде нет отрицательного межбуквенного интервала", negative.length === 0, negative.slice(0, 4).join(" | "));

  // ------------------------------------------------------------ ink analysis
  ink = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const measure = (text, font) => {
      ctx.font = font;
      const width = Math.ceil(ctx.measureText(text).width) + 12;
      const height = 200;
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.font = font;
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, 6, 150);
      const data = ctx.getImageData(0, 0, width, height).data;
      const cols = new Array(width).fill(false);
      for (let x = 0; x < width; x += 1) {
        for (let y = 0; y < height; y += 1) {
          if (data[(y * width + x) * 4 + 3] > 200) {
            cols[x] = true;
            break;
          }
        }
      }
      let runs = 0;
      let gaps = 0;
      let inRun = false;
      let gapWidth = 0;
      const gapSizes = [];
      for (const filled of cols) {
        if (filled && !inRun) {
          if (gapWidth) gapSizes.push(gapWidth);
          gapWidth = 0;
          runs += 1;
          inRun = true;
        } else if (!filled) {
          if (inRun) gaps += 1;
          inRun = false;
          gapWidth += 1;
        }
      }
      // leading/trailing whitespace is not a letter gap
      const meaningful = gapSizes.filter((g) => g > 0);
      return {
        runs,
        glyphs: [...text.replace(/\s/g, "")].length,
        minGap: meaningful.length ? Math.min(...meaningful) : 0,
        avgGap: meaningful.length
          ? Number((meaningful.reduce((a, b) => a + b, 0) / meaningful.length).toFixed(1))
          : 0,
      };
    };
    const title = "Старый сейв, новая глава";
    const desktopSize = getComputedStyle(document.querySelector(".chapter__title")).fontSize;
    const mobileSize = "26px"; // smallest rendered heading size (390/320 px viewport)
    return {
      rubikDesktop: measure(title, `800 ${desktopSize} "ILY-rubik"`),
      rubikMobile: measure(title, `800 ${mobileSize} "ILY-rubik"`),
      pressOld: measure(title, `${desktopSize} "ILY-pressstart"`),
      plex16: measure("Патч 32.0 установлен. История не закончена.", '400 16px "ILY-plexsans"'),
      letter: measure("Илюха, с днём рождения!", '800 29px "ILY-rubik"'),
    };
  });
  console.log("\n  Чернильные островки (runs / символов, мин. просвет px):");
  for (const [key, value] of Object.entries(ink)) {
    console.log(`    ${key.padEnd(9)} ${value.runs}/${value.glyphs}  min ${value.minGap}px  avg ${value.avgGap}px`);
  }
  check(
    "Заголовок (desktop): каждая буква отделена",
    ink.rubikDesktop.runs >= ink.rubikDesktop.glyphs,
    `${ink.rubikDesktop.runs}/${ink.rubikDesktop.glyphs}, просвет ${ink.rubikDesktop.minGap}px`,
  );
  check(
    "Заголовок 26px (телефон): буквы не слипаются",
    ink.rubikMobile.runs >= ink.rubikMobile.glyphs && ink.rubikMobile.minGap >= 1,
    `${ink.rubikMobile.runs}/${ink.rubikMobile.glyphs}, просвет ${ink.rubikMobile.minGap}px`,
  );
  check(
    "Основной текст: буквы не слипаются",
    ink.plex16.runs >= ink.plex16.glyphs,
    `${ink.plex16.runs}/${ink.plex16.glyphs}`,
  );
  check(
    "Старый пиксельный шрифт действительно слипал буквы",
    ink.pressOld.runs < ink.pressOld.glyphs,
    `${ink.pressOld.runs}/${ink.pressOld.glyphs} — для сравнения`,
  );

  // -------------------------------------------------------------- fits & shots
  await page.screenshot({ path: path.join(shots, "typo-final-desktop.png") });
  const desktopTitle = await page.locator(".chapter__title").evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
    clipped: el.scrollWidth > el.clientWidth + 2,
  }));
  check("Заголовок целиком в блоке (desktop)", !desktopTitle.clipped, JSON.stringify(desktopTitle));

  // proof sheet with every required string in its real style
  await page.setViewportSize({ width: 1440, height: 1240 });
  await page.evaluate(() => {
    const rows = [
      ["ИЛЮХА.EXE — логотип в HUD", '800 15px "ILY-rubik"', "#f0a93f"],
      ["ПАТЧ 32.0", '500 10px "ILY-plexmono"', "#8794ad"],
      ["ФИНАЛ · СТАРЫЙ СЕЙВ", '600 10.5px "ILY-plexmono"', "#8794ad"],
      ["Старый сейв, новая глава", '800 56px "ILY-rubik"', "#f3e9d6"],
      ["Патч 32.0 установлен. История не закончена.", '400 16px "ILY-plexsans"', "#b5c0d4"],
      ["На ягуар не хватает", '800 46px "ILY-rubik"', "#f3e9d6"],
      ["Ночная смена", '800 46px "ILY-rubik"', "#f3e9d6"],
      ["Пивной баф", '800 46px "ILY-rubik"', "#f3e9d6"],
      ["Илюха, с днём рождения!", '800 29px "ILY-rubik"', "#f3e9d6"],
      ["Илюха, с днём рождения, брат!", '800 29px "ILY-rubik"', "#f3e9d6"],
      ["Ну всё, выключай. — 05:10", '600 27px "ILY-rubik"', "#ffd28a"],
      ["Сохранение создано. Совесть не найдена.", '400 16px "ILY-plexsans"', "#b5c0d4"],
      ["23:40 → 05:10 · 08 · 1 2 3 4 5 6 7 8", '400 15px "ILY-pressstart"', "#ffd28a"],
    ];
    const sheet = document.createElement("div");
    sheet.id = "typo-proof";
    sheet.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:#070b16;padding:32px 40px;display:flex;flex-direction:column;gap:14px;overflow:hidden";
    rows.forEach(([text, font, color], index) => {
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:56px 1fr;gap:16px;align-items:baseline";
      const label = document.createElement("span");
      label.style.font = '500 10px "ILY-plexmono"';
      label.style.color = "#46608d";
      label.textContent = String(index + 1).padStart(2, "0");
      const line = document.createElement("span");
      line.style.font = font;
      line.style.color = color;
      line.style.letterSpacing = "0.005em";
      line.textContent = text;
      row.append(label, line);
      sheet.append(row);
    });
    document.body.appendChild(sheet);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shots, "typo-proof.png") });
  await page.evaluate(() => document.getElementById("typo-proof")?.remove());
  await page.setViewportSize({ width: 1440, height: 960 });

  // mobile pass
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const mobile = await page.evaluate(() => {
    const el = document.querySelector(".chapter__title");
    const rect = el.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    return {
      clipped: el.scrollWidth > el.clientWidth + 2,
      width: Math.round(rect.width),
      viewport: window.innerWidth,
      lines: Math.round(rect.height / lineHeight),
      family: getComputedStyle(el).fontFamily.split(",")[0],
      size: getComputedStyle(el).fontSize,
      docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  check("Заголовок не обрезан на 390px", !mobile.clipped && !mobile.docOverflow, JSON.stringify(mobile));
  check("Заголовок переносится, а не сжимается", mobile.lines >= 2, `${mobile.lines} строки, ${mobile.size}`);
  await page.screenshot({ path: path.join(shots, "typo-final-mobile.png") });

  await page.setViewportSize({ width: 320, height: 720 });
  await page.waitForTimeout(250);
  const narrow = await page.evaluate(() => {
    const el = document.querySelector(".chapter__title");
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      clipped: el.scrollWidth > el.clientWidth + 2,
      size: getComputedStyle(el).fontSize,
    };
  });
  check("Заголовок читаем и не вылезает на 320px", !narrow.overflow && !narrow.clipped, JSON.stringify(narrow));
} catch (error) {
  console.error("CRASH:", error);
  results.push({ name: "Аудит типографики", ok: false, detail: String(error) });
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

const failed = results.filter((r) => !r.ok);
console.log(`\nИТОГО: ${results.length - failed.length}/${results.length}`);
await writeFile(path.join(root, "tools", "typo-report.json"), JSON.stringify({ results, ink }, null, 2), "utf8");
process.exit(failed.length ? 1 : 0);