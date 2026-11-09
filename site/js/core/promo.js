import { PROMO_CODES } from "../config.js";

// Таблица промокодов может быть заменена данными с сервера (см. main.js).
let activeCodes = PROMO_CODES;
export function setPromoCodes(codes) { activeCodes = codes; }

export function normalizeCode(raw) {
  return String(raw ?? "").trim().toUpperCase();
}

export function findPromo(raw, codes = activeCodes) {
  const code = normalizeCode(raw);
  return Object.prototype.hasOwnProperty.call(codes, code) ? { code, ...codes[code] } : null;
}

// Единое правило округления скидки: до ближайшего целого рубля, половина — вверх.
// Считается целочисленно, без чисел с плавающей точкой.
export function calcDiscount(subtotal, percent) {
  if (!(subtotal > 0) || !(percent > 0)) return 0;
  return Math.floor((subtotal * percent + 50) / 100);
}
