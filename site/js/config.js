// Единственное место, где задаётся номер команды.
// Номер команды неизвестен — используется team00 (см. README).
export const TEAM_ID = "team00";

export const STORAGE_KEYS = Object.freeze({
  cart: `${TEAM_ID}:cart:v1`,
  favorites: `${TEAM_ID}:favorites:v1`,
  expedition: `${TEAM_ID}:expedition:v1`,
});

// Промокоды: процент скидки на стоимость товаров.
export const PROMO_CODES = Object.freeze({
  ORBIT10: Object.freeze({ percent: 10, label: "−10% на товары" }),
});

export const UNDO_MS = 8000; // сколько доступна кнопка «Отменить»
