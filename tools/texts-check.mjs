/**
 * Smoke test for the hidden text editor (?admin).
 * Verifies: panel opens, editing a line changes the page, the edit survives a
 * reload, "вернуть" restores the authored copy, and the panel stays hidden.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const shippedPath = path.join(root, "public", "texts.json");
const originalShipped = fs.readFileSync(shippedPath, "utf8");
const server = await createServer({
  root,
  server: { port: 5199, strictPort: true, host: "127.0.0.1" },
  logLevel: "error",
});
await server.listen();

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok, extra });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${extra ? ` — ${extra}` : ""}`);
};

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });

// Tiny silent WAV for the "final track" upload check.
const wavPath = path.join(root, "tools", "screenshots", "test-track.wav");
{
  const sampleRate = 8000;
  const samples = 1600;
  const data = Buffer.alloc(samples);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(wavPath), { recursive: true });
  fs.writeFileSync(wavPath, Buffer.concat([header, data]));
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: "ru-RU" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("http://127.0.0.1:5199/?admin", { waitUntil: "networkidle" });
  await page.waitForSelector(".tx", { timeout: 8000 });
  check("Панель открывается по ?admin", true);

  const rowCount = await page.locator(".tx__row").count();
  check("Панель нашла тексты на экране", rowCount > 5, `${rowCount} полей`);

  // Edit a line that is unique to the boot screen (subtitle text repeats in the lead).
  const needle = "нажми, чтобы загрузиться";
  const bootIndex = await page
    .locator(".tx__row")
    .evaluateAll(
      (rows, value) =>
        rows.findIndex((row) => row.querySelector("textarea")?.value.includes(value) ?? false),
      needle,
    );
  const bootRow = page.locator(".tx__row").nth(bootIndex);
  const hasBootRow = bootIndex >= 0;
  check("Строка про запуск есть в списке", hasBootRow, `index ${bootIndex}`);

  if (hasBootRow) {
    const textarea = bootRow.locator("textarea");
    await textarea.fill("жми сюда, не бойся");
    await page.waitForTimeout(120);
    const subtitle = await page.locator(".boot__start-hint").innerText();
    check("Правка сразу видна на странице", subtitle.includes("не бойся"), subtitle);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
    check("Escape закрывает панель", (await page.locator(".tx").count()) === 0);

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const afterReload = await page.locator(".boot__start-hint").innerText();
    check("Правка сохранилась после перезагрузки", afterReload.includes("не бойся"), afterReload);

    await page.goto("http://127.0.0.1:5199/?admin", { waitUntil: "networkidle" });
    await page.waitForSelector(".tx");
    const editedRow = page.locator(".tx__row.is-edited").first();
    check("Строка помечена как изменённая", (await editedRow.count()) > 0);
    await editedRow.locator(".tx__row-reset").click();
    await page.waitForTimeout(150);
    const restored = await page.locator(".boot__start-hint").innerText();
    check("«Вернуть» восстанавливает авторский текст", restored.includes("нажми, чтобы"), restored);
  }

  await page.goto("http://127.0.0.1:5199/", { waitUntil: "networkidle" });
  check("Без ?admin панели нет", (await page.locator(".tx").count()) === 0);

  // Shipped file: a fresh browser profile should pick up public/texts.json.
  fs.writeFileSync(
    shippedPath,
    JSON.stringify({ "нажми, чтобы загрузиться": "текст из texts.json" }, null, 2),
  );
  const fresh = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "ru-RU" });
  const freshPage = await fresh.newPage();
  await freshPage.goto("http://127.0.0.1:5199/", { waitUntil: "networkidle" });
  await freshPage.waitForTimeout(300);
  const shippedText = await freshPage.locator(".boot__start-hint").innerText();
  check("Правки из public/texts.json подхватываются", shippedText.includes("texts.json"), shippedText);
  await fresh.close();

  await page.keyboard.press("Control+Alt+KeyA");
  await page.waitForTimeout(150);
  check("Ctrl+Alt+A открывает панель", (await page.locator(".tx").count()) === 1);

  // Final track: upload → stored in IndexedDB → shown in the panel → removable.
  const trackStateText = () => page.locator(".tx__track-state").innerText();
  const waitTrackState = async (needle, timeout = 5000) => {
    const started = Date.now();
    let last = "";
    while (Date.now() - started < timeout) {
      last = await trackStateText();
      if (last.includes(needle)) return last;
      await page.waitForTimeout(100);
    }
    return last;
  };

  await page.setInputFiles(".tx__track input[type=file]", wavPath);
  const trackState = await waitTrackState("test-track.wav");
  check("Трек принят панелью", trackState.includes("test-track.wav"), trackState);

  const stored = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const request = indexedDB.open("ilyuha-audio", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("tracks", "readonly");
          const get = tx.objectStore("tracks").get("final");
          get.onsuccess = () =>
            resolve(get.result ? { name: get.result.name, size: get.result.size } : null);
          get.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
      }),
  );
  check("Трек лежит в IndexedDB", stored?.name === "test-track.wav", JSON.stringify(stored));

  await page.locator(".tx__track-actions").getByRole("button", { name: "Убрать" }).click();
  const cleared = await waitTrackState("встроенная");
  check("Трек убирается", cleared.includes("встроенная"), cleared);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("Панель без горизонтальной прокрутки на 390px", overflow <= 0, `${overflow}px`);

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(root, "tools", "screenshots", "11-admin.png") });

  check("Ошибок в консоли нет", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  fs.writeFileSync(shippedPath, originalShipped);
  await browser.close();
  await server.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\nИТОГО: ${results.length - failed.length}/${results.length}`);
process.exit(failed.length ? 1 : 0);