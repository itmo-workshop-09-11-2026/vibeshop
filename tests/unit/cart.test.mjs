import test from "node:test";
import assert from "node:assert/strict";
import * as Cart from "../../site/js/core/cart.js";
import { calcDiscount } from "../../site/js/core/promo.js";
import { formatRub, formatMass, plural } from "../../site/js/core/money.js";

// Тестовый каталог: цены 100 и 200 ₽ допустимы по заданию.
const catalog = Cart.indexCatalog([
  { id: "a", name: "A", price: 100, stock: 5, mass: 10 },
  { id: "b", name: "B", price: 200, stock: 2, mass: 20 },
  { id: "c", name: "C", price: 333, stock: 0, mass: 5 },
]);

test("пустая корзина: 0 ₽", () => {
  const s = Cart.summarize(Cart.emptyCart(), catalog);
  assert.equal(s.total, 0); assert.equal(s.count, 0); assert.equal(formatRub(s.total), "0 ₽");
});

test("100 ₽ + 200 ₽ = 300 ₽, удаление по одному", () => {
  let st = Cart.addItem(Cart.emptyCart(), catalog, "a").state;
  st = Cart.addItem(st, catalog, "b").state;
  assert.equal(Cart.summarize(st, catalog).total, 300);
  st = Cart.removeItem(st, "a");
  assert.equal(Cart.summarize(st, catalog).total, 200);
  st = Cart.removeItem(st, "b");
  const s = Cart.summarize(st, catalog);
  assert.equal(s.total, 0); assert.equal(s.lines.length, 0);
});

test("ORBIT10: 300 → 270; повтор не удваивает; неверный код ничего не меняет", () => {
  let st = Cart.addItem(Cart.addItem(Cart.emptyCart(), catalog, "a").state, catalog, "b").state;
  let r = Cart.applyPromo(st, "orbit10 ");
  assert.ok(r.ok); st = r.state;
  let s = Cart.summarize(st, catalog);
  assert.equal(s.subtotal, 300); assert.equal(s.discount, 30); assert.equal(s.total, 270);
  r = Cart.applyPromo(st, "ORBIT10");
  assert.ok(r.ok && r.already); assert.equal(Cart.summarize(r.state, catalog).total, 270);
  r = Cart.applyPromo(st, "NOPE");
  assert.equal(r.ok, false); assert.equal(r.state, st); assert.match(r.message, /нет/);
  assert.equal(Cart.applyPromo(st, "  ").ok, false);
  st = Cart.removePromo(st);
  assert.equal(Cart.summarize(st, catalog).total, 300);
});

test("округление скидки: половина вверх, целые рубли", () => {
  assert.equal(calcDiscount(5, 10), 1);   // 0,5 → 1
  assert.equal(calcDiscount(4, 10), 0);   // 0,4 → 0
  assert.equal(calcDiscount(15, 10), 2);  // 1,5 → 2
  assert.equal(calcDiscount(0, 10), 0);
  assert.equal(calcDiscount(1999, 10), 200);
});

test("количество: + / − , границы 1..остаток, суммы обновляются", () => {
  let st = Cart.addItem(Cart.emptyCart(), catalog, "b").state;
  st = Cart.setQty(st, catalog, "b", 2);
  assert.equal(Cart.summarize(st, catalog).total, 400);
  st = Cart.setQty(st, catalog, "b", 99); // сверх остатка
  assert.equal(st.items.b, 2);
  st = Cart.setQty(st, catalog, "b", -5); // отрицательное
  assert.equal(st.items.b, 1);
  st = Cart.setQty(st, catalog, "b", 0);
  assert.equal(st.items.b, 1);
  assert.equal(Cart.setQty(st, catalog, "a", 3), st); // нет в корзине
});

test("остатки ограничивают добавление товара", () => {
  let r = Cart.addItem(Cart.emptyCart(), catalog, "b", 5);
  assert.equal(r.added, 2); assert.equal(r.reason, "stock");
  r = Cart.addItem(r.state, catalog, "b");
  assert.equal(r.added, 0); assert.equal(r.reason, "stock"); assert.equal(r.state.items.b, 2);
  assert.equal(Cart.addItem(Cart.emptyCart(), catalog, "c").added, 0); // нет в наличии
  assert.equal(Cart.addItem(Cart.emptyCart(), catalog, "zzz").reason, "unknown");
  assert.equal(Cart.addItem(Cart.emptyCart(), catalog, "a", -1).added, 0);
});

test("остатки ограничивают добавление набора; результат частичный", () => {
  let st = Cart.addItem(Cart.emptyCart(), catalog, "b").state; // в корзине 1 из 2
  const r = Cart.addMany(st, catalog, [{ id: "a", qty: 3 }, { id: "b", qty: 3 }, { id: "c", qty: 1 }]);
  assert.equal(r.requested, 7); assert.equal(r.added, 4); assert.equal(r.complete, false);
  assert.deepEqual(r.results.map((x) => x.added), [3, 1, 0]);
  assert.equal(r.state.items.a, 3); assert.equal(r.state.items.b, 2); assert.ok(!("c" in r.state.items));
  const full = Cart.addMany(Cart.emptyCart(), catalog, [{ id: "a", qty: 2 }]);
  assert.ok(full.complete);
});

test("состояние неизменяемо", () => {
  const st0 = Cart.emptyCart();
  const st1 = Cart.addItem(st0, catalog, "a").state;
  assert.deepEqual(st0.items, {}); assert.notEqual(st0, st1);
});

test("форматирование", () => {
  assert.equal(formatRub(1234567), "1 234 567 ₽");
  assert.equal(formatMass(80), "80 г"); assert.equal(formatMass(1850), "1,85 кг"); assert.equal(formatMass(2000), "2 кг");
  assert.equal(plural(1, ["товар", "товара", "товаров"]), "товар");
  assert.equal(plural(3, ["товар", "товара", "товаров"]), "товара");
  assert.equal(plural(11, ["товар", "товара", "товаров"]), "товаров");
  assert.equal(plural(21, ["товар", "товара", "товаров"]), "товар");
});
