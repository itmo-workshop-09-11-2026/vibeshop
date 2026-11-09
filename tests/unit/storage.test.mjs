import test from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "../../site/js/core/storage.js";
import { createStore } from "../../site/js/core/store.js";
import { sanitizeCart, sanitizeFavorites, sanitizeExpedition } from "../../site/js/core/sanitize.js";
import { indexCatalog } from "../../site/js/core/cart.js";
import { STORAGE_KEYS } from "../../site/js/config.js";

const products = [
  { id: "a", name: "A", price: 100, stock: 3, mass: 1 },
  { id: "b", name: "B", price: 200, stock: 0, mass: 1 },
];
const catalog = indexCatalog(products);

class FakeLS {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

test("корзина и избранное восстанавливаются после «перезагрузки»", () => {
  const ls = new FakeLS();
  let store = createStore({ products, storage: createStorage(ls) });
  store.add("a", 2); store.applyPromo("ORBIT10"); store.toggleFavorite("b");
  store = createStore({ products, storage: createStorage(ls) });
  assert.equal(store.qty("a"), 2); assert.equal(store.getCart().promo, "ORBIT10");
  assert.ok(store.isFavorite("b"));
  assert.equal(store.summary().total, 180);
});

test("повреждённые данные не ломают хранилище", () => {
  for (const bad of ["{not json", "null", "42", "[]", '{"v":1,"items":"x"}', '{"v":2,"items":[]}', '{"v":1,"items":[null,{"id":5},{"id":"a","qty":-1},{"id":"a","qty":1.5}]}']) {
    const ls = new FakeLS({ [STORAGE_KEYS.cart]: bad, [STORAGE_KEYS.favorites]: bad });
    const store = createStore({ products, storage: createStorage(ls) });
    assert.equal(store.summary().total, 0, bad);
    assert.deepEqual([...store.favorites()], [], bad);
    store.add("a"); assert.equal(store.qty("a"), 1);
  }
});

test("устаревшие данные: неизвестные товары, остатки, дубли, чужой промокод", () => {
  const raw = { v: 1, items: [{ id: "a", qty: 99 }, { id: "a", qty: 1 }, { id: "gone", qty: 1 }, { id: "b", qty: 1 }], promo: "HACK" };
  const cart = sanitizeCart(raw, catalog);
  assert.deepEqual(cart, { items: { a: 3 }, promo: null });
  assert.deepEqual(sanitizeFavorites({ v: 1, ids: ["a", "a", "zzz", 7] }, catalog), ["a"]);
  assert.deepEqual(sanitizeExpedition({ v: 1, dest: "pluto", days: 5, priority: "x" }), { dest: "moon", days: 7, priority: "comfort" });
});

test("хранилище недоступно: работа в памяти без ошибок", () => {
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  const store = createStore({ products, storage: createStorage(broken) });
  assert.equal(store.persistent, false);
  store.add("a", 2); store.toggleFavorite("a");
  assert.equal(store.qty("a"), 2); assert.ok(store.isFavorite("a"));
  const none = createStore({ products, storage: createStorage(null) });
  none.add("a"); assert.equal(none.qty("a"), 1);
});

test("reinstate() (отмена удаления) возвращает позиции, не откатывая остальное, и учитывает остатки", () => {
  const store = createStore({ products, storage: createStorage(new FakeLS()) });
  store.add("a", 2);
  const removed = [{ id: "a", qty: 2 }];
  store.remove("a"); assert.equal(store.summary().total, 0);
  store.reinstate(removed); assert.equal(store.qty("a"), 2);
  store.clear(); store.reinstate(removed); assert.equal(store.summary().total, 200);
  // уже есть в корзине — не перезаписывается
  store.setQty("a", 1); store.reinstate(removed); assert.equal(store.qty("a"), 1);
  // сверх остатка и несуществующие — отбрасываются
  store.clear(); store.reinstate([{ id: "a", qty: 99 }, { id: "b", qty: 1 }, { id: "zzz", qty: 1 }]);
  assert.equal(store.qty("a"), 3); assert.equal(store.qty("b"), 0);
});
