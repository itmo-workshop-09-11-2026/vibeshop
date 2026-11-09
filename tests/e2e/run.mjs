// Браузерная проверка (Chrome через playwright-core). Запуск: node tests/e2e/run.mjs
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "tests/e2e/out");
mkdirSync(OUT, { recursive: true });
const PORT = 8300 + Math.floor(Math.random() * 500);
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/`;
const server = spawn("python3", ["main.py"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch({ channel: "chrome" });
let passed = 0, failed = 0;
const failures = [];
async function check(name, fn) {
  try { await fn(); passed++; console.log("  ✓", name); }
  catch (e) { failed++; failures.push(name); console.log("  ✗", name, "\n     ", String(e.message).split("\n")[0]); }
}
const eq = (a, b, m = "") => { if (a !== b) throw new Error(`${m} ожидалось «${b}», получено «${a}»`); };
const ok = (v, m = "условие ложно") => { if (!v) throw new Error(m); };
const nums = (s) => Number(String(s).replace(/[^\d−-]/g, "").replace("−", "-"));

// E2E_CSP=1: подставляем в ответы тот же Content-Security-Policy, что отдаёт nginx.
// Любое нарушение (инлайновый стиль, чужой скрипт, внешний ресурс) попадёт в консоль и провалит проверки.
const CSP = process.env.E2E_CSP
  ? readFileSync(path.join(ROOT, "deploy/nginx/orbita-site.conf"), "utf8").match(/Content-Security-Policy "([^"]+)"/)[1]
  : null;
if (CSP) console.log("Проверка под CSP:", CSP);

const TEST_CATALOG = `export const CATEGORIES=[{id:"food",name:"Питание"},{id:"gear",name:"Оборудование"},{id:"home",name:"Быт"},{id:"gifts",name:"Сувениры"}];
export const PRODUCTS=[
{id:"t100",sku:"Т-1",category:"food",name:"Тест 100",price:100,mass:10,stock:5,popularity:10,image:"./assets/products/patch.svg",short:"s",description:"d",specs:[["a","b"],["c","d"],["e","f"]]},
{id:"t200",sku:"Т-2",category:"gear",name:"Тест 200",price:200,mass:20,stock:2,popularity:20,image:"./assets/products/patch.svg",short:"s",description:"d",specs:[["a","b"],["c","d"],["e","f"]]}];`;

async function open(ctxOpts = {}, { testCatalog = false, init, routes } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...ctxOpts });
  if (CSP) await ctx.route("**/*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({ response: r, headers: { ...r.headers(), "content-security-policy": CSP } });
  });
  if (testCatalog) await ctx.route("**/js/data/products.js", (r) => r.fulfill({ contentType: "text/javascript", body: TEST_CATALOG }));
  if (init) await ctx.addInitScript(init);
  if (routes) await routes(ctx);
  const page = await ctx.newPage();
  const errors = [];
  // 404 на /api/… допустим: на статическом хостинге без бэкенда сайт откатывается на встроенный каталог.
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !(m.location().url.includes("/api/") && /40[34]|50\d/.test(m.text()))) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("requestfailed", (r) => errors.push("requestfailed " + r.url()));
  await page.goto(BASE);
  await page.waitForSelector("#grid .card");
  return { ctx, page, errors };
}
// Переключение чекбокса/радио как с клавиатуры: фокус + пробел (клик по прозрачному input может попасть под липкую шапку).
async function setChecked(page, locator, want = true) {
  if ((await locator.isChecked()) === want) return;
  await locator.focus(); await page.keyboard.press("Space");
  if ((await locator.isChecked()) !== want) throw new Error("не удалось переключить");
}
const cartOpen = async (page) => { await page.click("#cart-open"); await page.waitForSelector("#cart-dialog[open]"); };
const total = (page) => page.locator("#cart-foot .sum__total dd").innerText().then(nums);
const addBtn = (page, id) => page.locator(`[data-add="${id}"]`);

// ───────── A. Тестовый каталог: 100 ₽ и 200 ₽ ─────────
console.log("\nA. Корзина на тестовых ценах (100 ₽ и 200 ₽)");
{
  const { ctx, page, errors } = await open({}, { testCatalog: true });
  await check("пустая корзина показывает 0 ₽ и переход в каталог", async () => {
    await cartOpen(page);
    eq(await total(page), 0); ok(await page.locator("[data-act=to-catalog]").isVisible());
    eq(nums(await page.locator("#cart-sum").innerText()), 0);
    await page.keyboard.press("Escape");
  });
  await check("100 ₽ + 200 ₽ = 300 ₽", async () => {
    await addBtn(page, "t100").click(); await addBtn(page, "t200").click();
    await cartOpen(page); eq(await total(page), 300); eq(await page.locator("#cart-count").innerText(), "2");
  });
  await check("удаление первого → 200 ₽; второго → пусто и 0 ₽", async () => {
    await page.locator('.line[data-id="t100"] [data-act=remove]').click();
    eq(await total(page), 200);
    await page.locator('.line[data-id="t200"] [data-act=remove]').click();
    eq(await total(page), 0); ok(await page.locator(".cart-empty").isVisible());
  });
  await check("«Отменить» возвращает удалённую позицию", async () => {
    await page.locator(".toast__btn", { hasText: "Отменить" }).last().click();
    eq(await total(page), 200);
    await page.locator('.line[data-id="t200"] [data-act=remove]').click();
    await page.keyboard.press("Escape");
  });
  await check("промокод: 300 → 270, повтор 270, неверный не меняет, убрать → 300", async () => {
    await addBtn(page, "t100").click(); await addBtn(page, "t200").click();
    await cartOpen(page);
    eq(await total(page), 300);
    const apply = async (code) => { await page.fill("#promo-input", code); await page.click("#promo-form button[type=submit]"); };
    await apply("orbit10"); eq(await total(page), 270);
    await apply("ORBIT10"); eq(await total(page), 270);
    ok((await page.locator("#promo-msg").innerText()).includes("уже применён"));
    await apply("WRONG"); eq(await total(page), 270);
    await page.click("[data-act=promo-remove]"); eq(await total(page), 300);
    await apply("WRONG"); eq(await total(page), 300);
    ok((await page.locator("#promo-msg").innerText()).includes("Такого промокода нет"));
    await apply("ORBIT10"); eq(await total(page), 270);
  });
  await check("+/− обновляют суммы, предел — остаток, минимум 1", async () => {
    const row = page.locator('.line[data-id="t200"]');
    await row.locator("[data-act=inc]").click();            // 2 шт, остаток 2
    eq(await total(page), 100 + 400 - 50); // 500 − 10% = 450
    ok(await row.locator("[data-act=inc]").isDisabled(), "+ должен блокироваться на остатке");
    eq(nums(await row.locator(".line__total").innerText()), 400);
    await row.locator("[data-act=dec]").click(); await row.locator("[data-act=dec]").click().catch(() => {});
    eq(await row.locator(".qty__n").innerText(), "1");
    ok(await row.locator("[data-act=dec]").isDisabled(), "− блокируется на 1");
    eq(await total(page), 270);
  });
  await check("корзина восстанавливается после перезагрузки (с промокодом)", async () => {
    await page.reload(); await page.waitForSelector("#grid .card");
    eq(await page.locator("#cart-count").innerText(), "2");
    await cartOpen(page); eq(await total(page), 270);
    await page.click("[data-act=clear]"); eq(await total(page), 0);
    await page.keyboard.press("Escape");
  });
  ok(errors.length === 0 || (console.log(errors), false), "ошибки консоли");
  await ctx.close();
}

// ───────── B. Реальный каталог ─────────
console.log("\nB. Реальный каталог");
{
  const { ctx, page, errors } = await open();
  await check("16 товаров, все изображения загружены, нет горизонтальной прокрутки", async () => {
    eq(await page.locator("#grid .card").count(), 16);
    const bad = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
    eq(bad.length, 0, bad.join());
    eq(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  });
  await check("поиск + категория + сортировка работают вместе", async () => {
    await page.fill("#search", "а");
    await page.click('[data-cat="food"]');
    await page.selectOption("#sort", "price-asc");
    const prices = await page.$$eval("#grid .price", (els) => els.map((e) => Number(e.textContent.replace(/\D/g, ""))));
    ok(prices.length > 0 && prices.every((v, i) => i === 0 || prices[i - 1] <= v), "порядок цен " + prices);
    const cats = await page.$$eval("#grid .card__cat", (els) => [...new Set(els.map((e) => e.textContent))]);
    eq(cats.join(), "Питание");
    eq(await page.locator("#result-count").textContent(), `Найдено: ${prices.length} из 16`);
    await page.selectOption("#sort", "price-desc");
    const d = await page.$$eval("#grid .price", (els) => els.map((e) => Number(e.textContent.replace(/\D/g, ""))));
    ok(d.every((v, i) => i === 0 || d[i - 1] >= v));
  });
  await check("«Ничего не найдено» и сброс фильтров", async () => {
    await page.fill("#search", "ёжик");
    ok(await page.locator("#empty").isVisible()); eq(await page.locator("#grid .card").count(), 0);
    await page.click("#empty-reset");
    eq(await page.locator("#grid .card").count(), 16);
    eq(await page.inputValue("#search"), ""); eq(await page.inputValue("#sort"), "popular");
  });
  await check("добавление: кнопка показывает результат, счётчик и сумма в шапке", async () => {
    const b = addBtn(page, "mango-cubes");
    await b.click(); ok((await b.innerText()).includes("Добавлено"));
    eq(await page.locator("#cart-count").innerText(), "1"); eq(nums(await page.locator("#cart-sum").innerText()), 490);
    ok((await page.locator("#toasts .toast").last().innerText()).includes("добавлен в корзину"));
  });
  await check("остаток товара (meteor-kit: 3) ограничивает добавление", async () => {
    const b = addBtn(page, "meteor-kit");
    for (let i = 0; i < 3; i++) { await b.click(); await page.waitForTimeout(1400); }
    ok(await b.isDisabled()); ok((await b.innerText()).includes("Весь остаток"));
    await cartOpen(page);
    eq(await page.locator('.line[data-id="meteor-kit"] .qty__n').innerText(), "3");
    ok(await page.locator('.line[data-id="meteor-kit"] [data-act=inc]').isDisabled());
    ok((await page.locator(".line__limit").innerText()).includes("Максимум"));
    await page.keyboard.press("Escape");
  });
  await check("избранное сохраняется после перезагрузки; фильтр «только избранное»", async () => {
    await page.click('[data-fav="espresso"]'); await page.click('[data-fav="patch"]');
    eq(await page.locator("#fav-count").innerText(), "2");
    await page.reload(); await page.waitForSelector("#grid .card");
    eq(await page.locator('[data-fav="espresso"]').getAttribute("aria-pressed"), "true");
    await page.click("#fav-only");
    eq(await page.locator("#grid .card").count(), 2);
    await page.click("#fav-only");
    eq(await page.locator("#grid .card").count(), 16);
  });
  await check("быстрый просмотр: описание, характеристики, остаток, добавление; фокус возвращается", async () => {
    const opener = page.locator('.card__title [data-open="flashlight"]');
    await opener.focus(); await page.keyboard.press("Enter");
    await page.waitForSelector("#quick-dialog[open]");
    const t = await page.locator("#quick-body").innerText();
    ok(t.includes("Фонарь «Полярная ночь»") && t.includes("Яркость") && t.includes("В наличии: 9"));
    await page.click("[data-qv-add]");
    eq(await page.locator('[data-add="flashlight"]').count(), 1);
    ok((await page.locator("#quick-dialog [data-toast-host]").innerText()).includes("добавлен"));
    await page.screenshot({ path: path.join(OUT, "desktop-quickview.png") });
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() => document.activeElement?.dataset.open === "flashlight"), "фокус не вернулся");
  });
  await check("корзина: ловушка фокуса, Escape, возврат фокуса на кнопку", async () => {
    await page.focus("#cart-open"); await page.keyboard.press("Enter");
    await page.waitForSelector("#cart-dialog[open]");
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      ok(await page.evaluate(() => !!document.activeElement.closest("#cart-dialog")), "фокус ушёл из диалога на шаге " + i);
    }
    await page.screenshot({ path: path.join(OUT, "desktop-cart.png") });
    await page.keyboard.press("Escape");
    eq(await page.evaluate(() => document.activeElement.id), "cart-open");
  });
  await check("учебное оформление: режим обозначен, корзина очищается", async () => {
    await cartOpen(page); await page.click("[data-act=checkout]");
    await page.waitForSelector("#checkout-dialog[open]");
    ok((await page.locator("#checkout-body").innerText()).includes("Учебный режим"));
    eq(await page.locator("#checkout-dialog input").count(), 0, "полей ввода быть не должно");
    await page.click("#co-confirm");
    ok((await page.locator("#checkout-body").innerText()).includes("Учебный заказ оформлен"));
    await page.keyboard.press("Escape");
    eq(await page.locator("#cart-count").innerText(), "0");
    await page.keyboard.press("Escape");
  });
  ok(errors.length === 0 || (console.log(errors), false), "ошибки консоли в сценарии B");
  await ctx.close();
}

// ───────── C. Экспедиция ─────────
console.log("\nC. Собери экспедицию");
{
  const { ctx, page, errors } = await open();
  const kitIds = () => page.$$eval("#kit-list .kit__row", (r) => r.map((x) => x.dataset.id).join());
  const pick = async (name, value) => { await setChecked(page, page.locator(`input[name=${name}][value="${value}"]`)); };
  async function build(dest, days, prio) {
    await page.click('[data-step="1"]'); await pick("dest", dest); await page.click("[data-nav=next]");
    await pick("days", days); await page.click("[data-nav=next]");
    await pick("priority", prio); await page.click("[data-nav=next]");
    await page.waitForSelector("#kit-list");
  }
  let base;
  await check("сценарий: 3 шага → набор с пояснениями, стоимостью и массой", async () => {
    await build("moon", 7, "comfort"); base = await kitIds();
    ok((await page.locator("#exp-q").innerText()).includes("Луна · 7 дней · Комфорт"));
    ok(await page.locator(".kit__why").count() >= 5);
    ok(nums(await page.locator(".kit__total-main dd").innerText()) > 0);
    ok(/масса/i.test(await page.locator("#kit-totals").innerText()));
    await page.locator("#exp-app").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "desktop-expedition.png") });
  });
  await check("«Назад» сохраняет выбор", async () => {
    await build("station", 14, "research");
    await page.click(".exp__nav [data-nav=back]");
    ok(await page.locator('input[name=dest][value="station"]').isChecked());
    await page.click("[data-nav=next]"); ok(await page.locator('input[name=days][value="14"]').isChecked());
    await page.click("[data-nav=back]"); await page.click("[data-nav=next]"); await page.click("[data-nav=next]");
    ok(await page.locator('input[name=priority][value="research"]').isChecked());
  });
  await check("исключение позиции пересчитывает итоги; все исключены → кнопки недоступны", async () => {
    await build("moon", 7, "comfort");
    const before = nums(await page.locator(".kit__total-main dd").innerText());
    await setChecked(page, page.locator("#kit-list input[type=checkbox]").first(), false);
    ok(nums(await page.locator(".kit__total-main dd").innerText()) < before);
    const boxes = page.locator("#kit-list input[type=checkbox]"), n = await boxes.count();
    for (let i = 0; i < n; i++) await setChecked(page, boxes.nth(i), false);
    ok(await page.locator("#kit-add").isDisabled() && await page.locator("#kit-passport").isDisabled());
    ok(await page.locator("#kit-empty").isVisible());
    for (let i = 0; i < n; i++) await setChecked(page, boxes.nth(i), true);
  });
  await check("частичное добавление: остаток 3 уже занят → набор с метеорами сообщает об этом", async () => {
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector("#grid .card");
    for (let i = 0; i < 3; i++) { await addBtn(page, "meteor-kit").click(); await page.waitForTimeout(1400); }
    await build("station", 7, "research");
    ok((await kitIds()).includes("meteor-kit"));
    await page.click("#kit-add");
    const txt = await page.locator("#kit-result").innerText();
    ok(txt.includes("Добавлено частично") && txt.includes("Набор для наблюдения за метеорами") && txt.includes("добавлено 0 из 1"), txt);
    eq(await page.locator("#kit-result").getAttribute("data-kind"), "warn");
  });
  await check("паспорт: открывается, содержит состав; PNG и SVG реально скачиваются", async () => {
    await page.click("#kit-passport"); await page.waitForSelector("#passport-dialog[open]");
    const label = await page.locator(".passport-card svg").getAttribute("aria-label");
    ok(label.includes("Паспорт экспедиции ОР-МКС-7И") && label.includes("метеорами"), label);
    await page.screenshot({ path: path.join(OUT, "desktop-passport.png") });
    const [png] = await Promise.all([page.waitForEvent("download"), page.click('[data-p="png"]')]);
    ok(png.suggestedFilename().endsWith(".png"));
    const pngPath = path.join(OUT, "passport.png"); await png.saveAs(pngPath);
    const buf = readFileSync(pngPath);
    eq(buf.subarray(1, 4).toString(), "PNG"); ok(statSync(pngPath).size > 20000, "PNG слишком мал: " + statSync(pngPath).size);
    const [svg] = await Promise.all([page.waitForEvent("download"), page.click('[data-p="svg"]')]);
    const svgPath = path.join(OUT, "passport.svg"); await svg.saveAs(svgPath);
    ok(readFileSync(svgPath, "utf8").startsWith("<svg"));
    await page.keyboard.press("Escape");
    eq(await page.evaluate(() => document.activeElement.id), "kit-passport");
  });
  await check("весь сценарий проходит с клавиатуры (Tab/Enter/Space/стрелки)", async () => {
    await page.reload(); await page.waitForSelector("#exp-app");
    await page.locator('input[name=dest][value="moon"]').focus();
    await page.keyboard.press("ArrowRight");
    ok(await page.locator('input[name=dest][value="mars"]').isChecked(), "стрелка меняет выбор");
    await page.locator("[data-nav=next]").focus(); await page.keyboard.press("Enter");
    await page.locator("[data-nav=next]").focus(); await page.keyboard.press("Enter");
    await page.locator("[data-nav=next]").focus(); await page.keyboard.press("Enter");
    await page.waitForSelector("#kit-list");
    await page.locator("#kit-list input[type=checkbox]").first().focus(); await page.keyboard.press("Space");
    ok(await page.locator("#kit-list .kit__row.is-off").count() === 1);
    await page.locator("#kit-add").focus(); await page.keyboard.press("Enter");
    ok(await page.locator("#kit-result").isVisible());
  });
  ok(errors.length === 0 || (console.log(errors), false), "ошибки консоли в сценарии C");
  await ctx.close();
}

// ───────── D. Устойчивость хранилища ─────────
console.log("\nD. Хранилище");
{
  for (const [name, val] of [["невалидный JSON", "{broken"]]) {
    await check(`повреждённая корзина: ${name}`, async () => {
      const { ctx, page, errors } = await open({}, { init: `localStorage.setItem("team00:cart:v1", ${JSON.stringify(val)}); localStorage.setItem("team00:favorites:v1","[[[");` });
      ok(await page.locator("#grid .card").count() === 16, "каталог не отрисован");
      const n = await page.locator("#cart-count").innerText();
      ok(n === "0" || n === "15", "count " + n); // espresso клампится до остатка 15
      await addBtn(page, "patch").click();
      ok(Number(await page.locator("#cart-count").innerText()) >= 1);
      ok(errors.every((e) => !e.startsWith("pageerror")), errors.join());
      await ctx.close();
    });
  }
  await check("localStorage недоступен: сайт работает в рамках сессии", async () => {
    const { ctx, page, errors } = await open({}, { init: `Object.defineProperty(window,"localStorage",{get(){throw new Error("denied")}});` });
    await addBtn(page, "patch").click(); await addBtn(page, "patch").click();
    eq(await page.locator("#cart-count").innerText(), "2");
    await cartOpen(page); eq(await total(page), 900);
    ok(errors.every((e) => !e.startsWith("pageerror")), errors.join());
    await ctx.close();
  });
}

// ───────── E. Мобильный экран ─────────
console.log("\nE. Мобильный экран (390×844)");
{
  const { ctx, page, errors } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await check("каталог, добавление и корзина доступны", async () => {
    await page.locator("#catalog").scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
    eq(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "горизонтальная прокрутка");
    await page.screenshot({ path: path.join(OUT, "mobile-catalog.png") });
    await addBtn(page, "mag-mug").tap();
    await page.locator("#cart-open").tap(); await page.waitForSelector("#cart-dialog[open]");
    eq(await total(page), 1400); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "mobile-cart.png") });
    const box = await page.locator("#cart-dialog .dlg__box").boundingBox(); ok(box.width <= 390 && box.x >= 0, JSON.stringify(box));
    await page.keyboard.press("Escape");
  });
  await check("подбор экспедиции доступен и помещается по ширине", async () => {
    await page.locator("#expedition").scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
    await page.locator('input[name=dest][value="mars"]').check({ force: true });
    await page.locator("[data-nav=next]").tap(); await page.locator("[data-nav=next]").tap(); await page.locator("[data-nav=next]").tap();
    await page.waitForSelector("#kit-list");
    await page.locator("#exp-app").scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, "mobile-expedition.png") });
    eq(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await page.locator("#kit-passport").tap(); await page.waitForSelector("#passport-dialog[open]");
    await page.screenshot({ path: path.join(OUT, "mobile-passport.png") });
    eq(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  });
  ok(errors.length === 0 || (console.log(errors), false), "ошибки консоли на мобильном");
  await ctx.close();
}

// ───────── F. Уменьшение движения ─────────
console.log("\nF. prefers-reduced-motion");
{
  const { ctx, page } = await open({ reducedMotion: "reduce" });
  await check("анимации отключены", async () => {
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector(".bp-dot")).animationName);
    eq(anim, "none");
  });
  await ctx.close();
}

// ───────── G. Бэкенд: каталог и промокоды из API, откат на встроенные данные ─────────
console.log("\nG. Интеграция с API");
{
  const apiBody = JSON.stringify({
    categories: [], promos: { SALE50: { percent: 50, label: "−50% на товары" } },
    products: [{ id: "api-1", sku: "API-1", category: "food", name: "Товар из API", short: "s", description: "d", price: 1000, mass: 10, stock: 2, popularity: 1, image: "./assets/products/patch.svg", specs: [["a", "b"]] }],
  });
  await check("каталог и промокоды берутся из API (source=api)", async () => {
    const { ctx, page } = await open({}, { routes: (c) => c.route("**/api/catalog", (r) => r.fulfill({ contentType: "application/json", body: apiBody })) });
    eq(await page.getAttribute("html", "data-catalog"), "api");
    eq(await page.locator("#grid .card").count(), 1);
    await addBtn(page, "api-1").click(); await addBtn(page, "api-1").click();
    await page.waitForTimeout(1500); ok(await addBtn(page, "api-1").isDisabled(), "остаток 2 из API");
    await cartOpen(page); eq(await total(page), 2000);
    await page.fill("#promo-input", "orbit10"); await page.click("#promo-form button[type=submit]");
    ok((await page.locator("#promo-msg").innerText()).includes("Такого промокода нет"), "встроенный код не должен работать");
    await page.fill("#promo-input", "sale50"); await page.click("#promo-form button[type=submit]");
    eq(await total(page), 1000);
    await ctx.close();
  });
  for (const [name, handler] of [["сервер отвечает 500", (r) => r.fulfill({ status: 500, body: "boom" })]]) {
    await check(`откат на встроенные данные: ${name}`, async () => {
      const { ctx, page, errors } = await open({}, { routes: (c) => c.route("**/api/catalog", handler) });
      eq(await page.getAttribute("html", "data-catalog"), "builtin");
      eq(await page.locator("#grid .card").count(), 16);
      await addBtn(page, "patch").click(); eq(await page.locator("#cart-count").innerText(), "1");
      ok(errors.every((e) => !e.startsWith("pageerror")), errors.join());
      await ctx.close();
    });
  }
  if (process.env.BACKEND_URL) {
    await check("настоящий FastAPI: каталог и промокод через прокси", async () => {
      const { ctx, page } = await open({}, { routes: (c) => c.route("**/api/**", async (r) => {
        const u = new URL(r.request().url());
        await r.fulfill({ response: await r.fetch({ url: process.env.BACKEND_URL + u.pathname + u.search }) });
      }) });
      eq(await page.getAttribute("html", "data-catalog"), "api");
      eq(await page.locator("#grid .card").count(), 16);
      await addBtn(page, "patch").click(); await addBtn(page, "espresso").click();
      await cartOpen(page);
      await page.fill("#promo-input", "ORBIT10"); await page.click("#promo-form button[type=submit]");
      eq(await total(page), 1026); // 450 + 690 = 1140, скидка 10% = 114
      await ctx.close();
    });
  } else console.log("  – настоящий FastAPI: пропущено (нет BACKEND_URL)");
}

await browser.close(); server.kill();
console.log(`\nИтого: пройдено ${passed}, провалено ${failed}`);
if (failed) console.log("Провалены:\n - " + failures.join("\n - "));
process.exit(failed ? 1 : 0);
