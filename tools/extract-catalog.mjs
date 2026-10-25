/**
 * Extracts every user-facing text in the game into src/texts/catalog.json.
 * Plays the full scenario (all chapters, all choices, all states) in a real
 * Chromium and walks the DOM, so the hidden admin panel can list and edit any
 * string without the player having to navigate there first.
 *
 * Run: npm run texts:catalog
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outPath = path.join(root, "src", "texts", "catalog.json");

const server = await createServer({
  root,
  server: { port: 5197, strictPort: true, host: "127.0.0.1" },
  logLevel: "error",
});
await server.listen();

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
});

const seen = new Set();
const entries = [];

const collect = async (page, group) => {
  const found = await page.evaluate((group) => {
    const CONTEXT_SELECTOR =
      ".letter, .player, .panel, .chapter__head, .reaction, .award-panel, .journal, .changelog, .sheet, .hud, .site-foot, .boot__crt, .night__crt, .night__log, .final, .toasts, .toast, section, header, footer, main";
    const normalize = (value) => value.replace(/\s+/g, " ").trim();
    const describe = (parent) => {
      const block = parent.closest(CONTEXT_SELECTOR);
      if (!block) return parent.tagName.toLowerCase();
      const className = typeof block.className === "string" ? block.className : "";
      const marker = className
        .split(/\s+/)
        .filter(Boolean)
        .map((name) => name.replace(/^is-/, ""))
        .slice(0, 2)
        .join(" ");
      return marker ? `${block.tagName.toLowerCase()} · ${marker}` : block.tagName.toLowerCase();
    };
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest("[data-texts-ui]")) continue;
      if (parent.closest('[aria-hidden="true"]')) continue;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") continue;
      const text = normalize(node.nodeValue ?? "");
      // skip structural glyphs, single chars and pure numbers/times
      if (!text || text.length < 2 || /^[\d\s:./%–—-]+$/.test(text)) continue;
      out.push({ text, context: describe(parent) });
    }
    if (document.title.trim().length > 1) {
      out.push({ text: document.title.trim(), context: "заголовок вкладки" });
    }
    return out;
  }, group);

  for (const item of found) {
    if (seen.has(item.text)) continue;
    seen.add(item.text);
    const context = item.context;
    let finalGroup = group;
    if (context.includes("заголовок вкладки")) finalGroup = "tab";
    else if (context.includes("site-foot") || context.includes("hud")) finalGroup = "chrome";
    else if (context.includes("sheet")) finalGroup = "settings";
    entries.push({ text: item.text, group: finalGroup, context });
  }
};

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    locale: "ru-RU",
  });
  const page = await context.newPage();
  // Стакер сам бросает ящики: флаг автоигры, чтобы каталог собирался быстро.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("ilyuha-stack-auto", "1");
    } catch {
      /* ignore */
    }
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // 01 · boot (idle, booting, ready)
  await page.goto("http://127.0.0.1:5197/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await collect(page, "boot");
  await page.getByRole("button", { name: /запустить систему/i }).click();
  await page.waitForTimeout(700);
  await collect(page, "boot");
  await page.waitForSelector("button:has-text('Открыть профиль персонажа')", { timeout: 15000 });
  await collect(page, "boot");

  // 02 · profile (+ settings dialog with all locked achievements)
  await page.getByRole("button", { name: /открыть профиль/i }).click();
  await page.waitForTimeout(400);
  await collect(page, "profile");
  await page.getByRole("button", { name: /настройки и достижения/i }).click();
  await page.waitForTimeout(300);
  await collect(page, "settings");
  await page.getByRole("button", { name: /закрыть настройки/i }).click();
  await page.waitForTimeout(200);

  // 03 · school, all three reactions (first click also fires a toast)
  await page.getByRole("button", { name: /глава 03/i }).click();
  await page.waitForTimeout(400);
  await collect(page, "school");
  await page.getByRole("button", { name: /спокойно/i }).click();
  await page.waitForTimeout(250);
  await collect(page, "school");
  await page.getByRole("button", { name: /фигню/i }).click();
  await page.waitForTimeout(300);
  await collect(page, "school");
  await page.getByRole("button", { name: /пойти играть/i }).click();
  await page.waitForTimeout(300);
  await collect(page, "school");

  // 04 · minigame: погрузка фуры (интро, процесс, итог)
  await page.getByRole("button", { name: /глава 04/i }).click();
  await page.waitForTimeout(400);
  await collect(page, "minigame");
  await page.getByRole("button", { name: /начать погрузку/i }).click();
  await page.waitForTimeout(3000);
  await collect(page, "minigame");
  for (let i = 0; i < 600; i += 1) {
    if (await page.locator(".night__verdict:not(.stack__failed)").count()) break;
    const retry = page.locator(".stack__failed .btn");
    if (await retry.count()) await retry.first().click({ timeout: 400 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(300);
  await collect(page, "minigame");

  // 05 · family
  await page.getByRole("button", { name: /глава 05/i }).click();
  await page.waitForTimeout(400);
  await collect(page, "family");

  // 06 · work, all three reactions
  await page.getByRole("button", { name: /глава 06/i }).click();
  await page.waitForTimeout(400);
  await collect(page, "work");
  for (const label of [/паниковать/i, /разобраться/i, /сделать вид/i]) {
    await page.getByRole("button", { name: label }).first().click();
    await page.waitForTimeout(250);
    await collect(page, "work");
  }

  // 07 · patch, before and after the buff
  await page.getByRole("button", { name: /глава 07/i }).click();
  await page.waitForTimeout(400);
  await collect(page, "patch");
  await page.getByRole("button", { name: /получить пивной баф/i }).click();
  await page.waitForTimeout(400);
  await collect(page, "patch");

  // 08 · final, letter + player (play the track to earn the last achievement)
  await page.getByRole("button", { name: /финал: старый сейв/i }).click();
  await page.waitForTimeout(500);
  await collect(page, "final");
  await page.locator(".player__play").click();
  await page.waitForTimeout(900);
  await collect(page, "final");
  await page.locator(".player__play").click();
  await page.waitForTimeout(200);

  // settings again — now every achievement is unlocked and shows its real text
  await page.getByRole("button", { name: /настройки и достижения/i }).click();
  await page.waitForTimeout(300);
  await collect(page, "settings");
  await page.getByRole("button", { name: /закрыть настройки/i }).click();

  if (errors.length) {
    console.error("Ошибки на странице:", errors.join(" | "));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  await server.close();
}

const ORDER = ["boot", "profile", "school", "minigame", "family", "work", "patch", "final", "settings", "chrome", "tab"];
entries.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group));

fs.writeFileSync(outPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
console.log(`Готово: ${entries.length} строк → src/texts/catalog.json`);
for (const group of ORDER) {
  const count = entries.filter((e) => e.group === group).length;
  if (count) console.log(`  ${group.padEnd(9)} ${count}`);
}