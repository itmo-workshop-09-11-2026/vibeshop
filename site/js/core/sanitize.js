// Проверка данных, прочитанных из хранилища: повреждённое и устаревшее отбрасывается.
import { emptyCart } from "./cart.js";
import { findPromo } from "./promo.js";
import { DESTINATIONS, DURATIONS, PRIORITIES } from "../data/expedition.js";

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function sanitizeCart(raw, catalog) {
  if (!isObj(raw) || raw.v !== 1 || !Array.isArray(raw.items)) return emptyCart();
  const items = {};
  for (const row of raw.items) {
    if (!isObj(row) || typeof row.id !== "string" || !Number.isInteger(row.qty)) continue;
    const p = catalog.get(row.id);
    if (!p || row.qty < 1 || p.stock < 1 || row.id in items) continue;
    items[row.id] = Math.min(row.qty, p.stock);
  }
  const promo = typeof raw.promo === "string" ? findPromo(raw.promo)?.code ?? null : null;
  return { items, promo };
}

export const serializeCart = (state) => ({
  v: 1,
  items: Object.entries(state.items).map(([id, qty]) => ({ id, qty })),
  promo: state.promo,
});

export function sanitizeFavorites(raw, catalog) {
  if (!isObj(raw) || raw.v !== 1 || !Array.isArray(raw.ids)) return [];
  return [...new Set(raw.ids.filter((id) => typeof id === "string" && catalog.has(id)))];
}

export const serializeFavorites = (ids) => ({ v: 1, ids: [...ids] });

export const DEFAULT_EXPEDITION = Object.freeze({ dest: "moon", days: 7, priority: "comfort" });

export function sanitizeExpedition(raw) {
  if (!isObj(raw) || raw.v !== 1) return { ...DEFAULT_EXPEDITION };
  const dest = DESTINATIONS.some((d) => d.id === raw.dest) ? raw.dest : DEFAULT_EXPEDITION.dest;
  const days = DURATIONS.some((d) => d.days === raw.days) ? raw.days : DEFAULT_EXPEDITION.days;
  const priority = PRIORITIES.some((p) => p.id === raw.priority) ? raw.priority : DEFAULT_EXPEDITION.priority;
  return { dest, days, priority };
}

export const serializeExpedition = (sel) => ({ v: 1, ...sel });
