import { chromium } from "playwright";
import { createServer } from "vite";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const server = await createServer({ root, server: { port: 5199, strictPort: true, host: "127.0.0.1" }, logLevel: "error" });
await server.listen();

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  try {
    window.localStorage.setItem("ilyuha-night-fast", "1");
  } catch {
    /* ignore */
  }
});
const messages = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") messages.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => messages.push(`[pageerror] ${e.message}`));

await page.goto("http://127.0.0.1:5199/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /запустить систему/i }).click();
await page.waitForSelector("button:has-text('Открыть профиль персонажа')", { timeout: 15000 });
await page.getByRole("button", { name: /открыть профиль/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /глава 03/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /спокойно/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /глава 04/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /начать смену/i }).click();
for (let i = 0; i < 600; i += 1) {
  if (await page.locator(".night__verdict").count()) break;
  const task = page.locator(".night__task.is-live .btn");
  if (await task.count()) await task.first().click({ timeout: 400 }).catch(() => {});
  const boost = page.locator(".night__boost:not([disabled])");
  if (await boost.count()) await boost.first().click({ timeout: 400 }).catch(() => {});
  await page.waitForTimeout(100);
}
await page.getByRole("button", { name: /глава 05/i }).click();
await page.getByRole("button", { name: /глава 06/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /разобраться/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /глава 07/i }).click();
await page.getByRole("button", { name: /получить пивной баф/i }).click();
await page.getByRole("button", { name: /финал/i }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: /настройки и достижения/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /закрыть настройки/i }).click();

console.log(messages.length ? messages.join("\n") : "no console warnings/errors in dev");
await browser.close();
await server.close();