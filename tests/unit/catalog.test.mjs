import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCTS, CATEGORIES } from "../../site/js/data/products.js";
import { filterProducts } from "../../site/js/core/catalog.js";
import { recommend, kitTotals, describeExpedition, passportNumber } from "../../site/js/core/expedition.js";
import { EXPEDITION_META } from "../../site/js/data/expedition.js";
import * as Cart from "../../site/js/core/cart.js";
import { existsSync } from "node:fs";

test("каталог: 12–16 товаров, 4 категории, полные данные", () => {
  assert.ok(PRODUCTS.length >= 12 && PRODUCTS.length <= 16);
  assert.equal(CATEGORIES.length, 4);
  const ids = new Set();
  for (const p of PRODUCTS) {
    assert.ok(!ids.has(p.id)); ids.add(p.id);
    assert.ok(CATEGORIES.some((c) => c.id === p.category), p.id);
    assert.ok(Number.isInteger(p.price) && p.price > 0, p.id);
    assert.ok(Number.isInteger(p.stock) && p.stock >= 0, p.id);
    assert.ok(p.name && p.short && p.description && p.specs.length >= 3, p.id);
    assert.ok(existsSync(new URL(`../../site/${p.image.slice(2)}`, import.meta.url)), `нет изображения ${p.image}`);
    assert.ok(EXPEDITION_META[p.id], `нет метаданных набора ${p.id}`);
  }
  for (const c of CATEGORIES) assert.ok(PRODUCTS.some((p) => p.category === c.id));
});

test("поиск, категория и сортировка работают вместе", () => {
  const all = filterProducts(PRODUCTS);
  assert.equal(all.length, PRODUCTS.length);
  const food = filterProducts(PRODUCTS, { category: "food" });
  assert.ok(food.length && food.every((p) => p.category === "food"));
  const q = filterProducts(PRODUCTS, { query: "  КРУЖКА " });
  assert.deepEqual(q.map((p) => p.id), ["mag-mug"]);
  assert.deepEqual(filterProducts(PRODUCTS, { query: "эспрессо", category: "gear" }), []);
  const asc = filterProducts(PRODUCTS, { category: "food", sort: "price-asc" }).map((p) => p.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  const desc = filterProducts(PRODUCTS, { query: "н", sort: "price-desc" }).map((p) => p.price);
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  const pop = filterProducts(PRODUCTS, { sort: "popular" }).map((p) => p.popularity);
  assert.deepEqual(pop, [...pop].sort((a, b) => b - a));
  assert.deepEqual(filterProducts(PRODUCTS, { query: "ёжик" }), []);
  const fav = filterProducts(PRODUCTS, { favoritesOnly: true, category: "food" }, new Set(["espresso", "patch"]));
  assert.deepEqual(fav.map((p) => p.id), ["espresso"]);
  assert.equal(filterProducts(PRODUCTS, { query: "кубики" }).length, 1);
  assert.equal(filterProducts(PRODUCTS, { query: "ПОЛЯРНАЯ" }).length, 1); // регистр
});

test("подбор: параметры реально меняют рекомендации", () => {
  const sig = (sel) => recommend(sel, PRODUCTS).map((i) => `${i.id}x${i.qty}`).join();
  const seen = new Set();
  for (const dest of ["moon", "mars", "station"]) for (const priority of ["comfort", "research", "light"]) {
    for (const days of [3, 7, 14]) seen.add(sig({ dest, days, priority }));
  }
  assert.equal(seen.size, 27, "каждая комбинация даёт свой набор");
  assert.notEqual(sig({ dest: "moon", days: 7, priority: "comfort" }), sig({ dest: "mars", days: 7, priority: "comfort" }));
  assert.notEqual(sig({ dest: "moon", days: 3, priority: "comfort" }), sig({ dest: "moon", days: 14, priority: "comfort" }));
  const light = kitTotals(recommend({ dest: "moon", days: 7, priority: "light" }, PRODUCTS)).mass;
  const comfort = kitTotals(recommend({ dest: "moon", days: 7, priority: "comfort" }, PRODUCTS)).mass;
  assert.ok(light < comfort, "лёгкий багаж легче");
});

test("подбор: только существующие товары в наличии, питание всегда есть, есть пояснения", () => {
  for (const dest of ["moon", "mars", "station"]) for (const priority of ["comfort", "research", "light"]) for (const days of [3, 7, 14]) {
    const kit = recommend({ dest, days, priority }, PRODUCTS);
    assert.ok(kit.length >= 4);
    assert.ok(kit.some((i) => i.product.category === "food"));
    for (const i of kit) {
      assert.ok(i.product.stock > 0 && i.qty >= 1 && i.qty <= i.product.stock);
      assert.ok(i.why.length > 10, `${i.id}/${dest}`);
    }
    assert.ok(!kit.some((i) => i.id === "station-model"));
  }
});

test("итоги набора учитывают исключения; паспорт детерминирован", () => {
  const sel = { dest: "mars", days: 7, priority: "research" };
  const kit = recommend(sel, PRODUCTS);
  const full = kitTotals(kit);
  const without = kitTotals(kit, new Set([kit[0].id]));
  assert.equal(full.cost - without.cost, kit[0].product.price * kit[0].qty);
  assert.equal(full.mass - without.mass, kit[0].product.mass * kit[0].qty);
  assert.equal(kitTotals(kit, new Set(kit.map((i) => i.id))).cost, 0);
  assert.equal(passportNumber(sel, kit), passportNumber(sel, kit));
  assert.match(passportNumber(sel, kit), /^ОР-МАР-7И-\d{4}$/);
  assert.match(describeExpedition(sel).title, /Марс · 7 дней · Исследования/);
});

