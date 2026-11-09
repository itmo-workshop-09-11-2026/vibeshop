// Чистая логика корзины. Состояние неизменяемо: каждая функция возвращает новый объект.
// state = { items: { [productId]: qty }, promo: null | "ORBIT10" }
// catalog — Map<id, product>. Все суммы считаются только в summarize().
import { calcDiscount, findPromo } from "./promo.js";

export const emptyCart = () => ({ items: {}, promo: null });

export function indexCatalog(products) {
  return new Map(products.map((p) => [p.id, p]));
}

export const qtyOf = (state, id) => state.items[id] ?? 0;

export function stockLeft(state, catalog, id) {
  const p = catalog.get(id);
  return p ? Math.max(0, p.stock - qtyOf(state, id)) : 0;
}

// Добавляет не больше остатка. reason: "ok" | "stock" | "unknown" | "invalid"
export function addItem(state, catalog, id, qty = 1) {
  const p = catalog.get(id);
  if (!p) return { state, added: 0, reason: "unknown" };
  if (!Number.isInteger(qty) || qty < 1) return { state, added: 0, reason: "invalid" };
  const room = stockLeft(state, catalog, id);
  const added = Math.min(qty, room);
  if (added === 0) return { state, added: 0, reason: "stock" };
  return {
    state: { ...state, items: { ...state.items, [id]: qtyOf(state, id) + added } },
    added,
    reason: added < qty ? "stock" : "ok",
  };
}

// Устанавливает количество в пределах 1..остаток. Для удаления есть removeItem().
export function setQty(state, catalog, id, qty) {
  const p = catalog.get(id);
  if (!p || !(id in state.items) || !Number.isFinite(qty)) return state;
  const next = Math.max(1, Math.min(Math.floor(qty), p.stock));
  if (next === state.items[id]) return state;
  return { ...state, items: { ...state.items, [id]: next } };
}

export function removeItem(state, id) {
  if (!(id in state.items)) return state;
  const { [id]: _removed, ...rest } = state.items;
  return { ...state, items: rest };
}

// Возвращает удалённые позиции [{ id, qty }] (для «Отменить»). Позиции, которые уже
// снова есть в корзине, не трогаются; количество не превышает остаток.
export function reinstate(state, catalog, entries) {
  let items = state.items;
  for (const { id, qty } of entries) {
    const p = catalog.get(id);
    if (!p || id in items || p.stock < 1 || !(qty >= 1)) continue;
    items = { ...items, [id]: Math.min(Math.floor(qty), p.stock) };
  }
  return items === state.items ? state : { ...state, items };
}

export function clearCart(state) {
  return { ...state, items: {} };
}

// Добавление набора: [{ id, qty }]. Возвращает подробности по каждой позиции.
export function addMany(state, catalog, wanted) {
  let current = state;
  const results = [];
  for (const { id, qty } of wanted) {
    const r = addItem(current, catalog, id, qty);
    current = r.state;
    results.push({ id, requested: qty, added: r.added, inCart: qtyOf(current, id) });
  }
  const requested = results.reduce((s, r) => s + r.requested, 0);
  const added = results.reduce((s, r) => s + r.added, 0);
  return { state: current, results, requested, added, complete: added === requested };
}

// Промокод. Повторное применение того же кода ничего не меняет.
export function applyPromo(state, raw) {
  const promo = findPromo(raw);
  if (!promo) {
    const empty = String(raw ?? "").trim() === "";
    return { state, ok: false, message: empty ? "Введите промокод." : "Такого промокода нет. Проверьте написание." };
  }
  if (state.promo === promo.code) return { state, ok: true, already: true, message: `Промокод ${promo.code} уже применён.` };
  return { state: { ...state, promo: promo.code }, ok: true, message: `Промокод ${promo.code} применён: ${promo.label}.` };
}

export function removePromo(state) {
  return state.promo ? { ...state, promo: null } : state;
}

// Единственный источник сумм.
export function summarize(state, catalog) {
  const lines = [];
  for (const [id, qty] of Object.entries(state.items)) {
    const product = catalog.get(id);
    if (!product || qty < 1) continue;
    lines.push({ id, product, qty, lineTotal: product.price * qty, lineMass: product.mass * qty });
  }
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const promo = state.promo ? findPromo(state.promo) : null;
  const discount = promo ? calcDiscount(subtotal, promo.percent) : 0;
  return { lines, count, subtotal, discount, total: subtotal - discount, promo, mass: lines.reduce((s, l) => s + l.lineMass, 0) };
}
