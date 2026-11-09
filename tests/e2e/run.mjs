import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome' });
const base = process.env.BASE_URL || 'http://localhost:8900';
mkdirSync('tests/e2e/out', { recursive: true });
let passed = 0;
try {
  for (const [width, height] of [[1440,900], [1920,1080], [1366,768], [390,844], [375,812]]) {
    const page = await browser.newPage({ viewport: {width,height} });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.locator('.card').first().waitFor();
    await page.waitForTimeout(450);
    const bounds = await page.evaluate(() => ({
      hero: document.querySelector('.hero').getBoundingClientRect().bottom,
      cta: document.querySelector('.hero__cta').getBoundingClientRect().bottom,
      art: document.querySelector('.hero__art').getBoundingClientRect().bottom,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.ok(bounds.hero >= height - 1, JSON.stringify(bounds));
    assert.ok(bounds.cta <= height && bounds.art <= height + 1, JSON.stringify(bounds));
    assert.equal(bounds.overflow, false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `tests/e2e/out/hero-${width}.png` });
    console.log(`✓ Баннер целиком, каталог скрыт, без переполнения: ${width}×${height}`); passed++;
    await page.close();
  }
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ viewport: { width:1440,height:900 }, reducedMotion });
    await page.goto(base);
    const add = page.locator('[data-add]').first();
    await add.waitFor();
    await add.click();
    assert.match(await add.innerText(), /Добавлено/);
    const motion = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    assert.equal(motion > 0, reducedMotion === 'no-preference');
    await page.locator('#cart-open').click();
    await page.locator('#promo-input').fill('ORBIT10');
    await page.locator('#promo-form button[type=submit]').click();
    assert.match(await page.locator('.promo__applied').innerText(), /ORBIT10/);
    const total = await page.locator('.sum__total dd').innerText();
    await page.waitForTimeout(450);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
    await page.locator('#promo-input').fill('WRONG');
    await page.locator('#promo-form button[type=submit]').click();
    assert.equal(await page.locator('#promo-input').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('.sum__total dd').innerText(), total);
    await page.screenshot({ path:`tests/e2e/out/promo-${reducedMotion}.png` });
    console.log(`✓ Добавление, промокод, ошибка и завершение анимаций: ${reducedMotion}`); passed++;
    await page.close();
  }
  console.log(`Пройдено: ${passed}`);
} finally { await browser.close(); }
