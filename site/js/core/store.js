// Хранилище состояния: корзина + избранное. Подписка на изменения, автосохранение.
import * as Cart from "./cart.js";
import { sanitizeCart, serializeCart, sanitizeFavorites, serializeFavorites } from "./sanitize.js";
import { STORAGE_KEYS } from "../config.js";

export function createStore({ products, storage }) {
  const catalog = Cart.indexCatalog(products);
  const listeners = new Set();

  const cartRead = storage.read(STORAGE_KEYS.cart);
  const favRead = storage.read(STORAGE_KEYS.favorites);
  let cart = sanitizeCart(cartRead.value, catalog);
  let favorites = sanitizeFavorites(favRead.value, catalog);
  const recovered = cartRead.status === "corrupt" || favRead.status === "corrupt";
  // Повреждённые записи перезаписываем чистым состоянием.
  if (cartRead.status === "corrupt") storage.write(STORAGE_KEYS.cart, serializeCart(cart));
  if (favRead.status === "corrupt") storage.write(STORAGE_KEYS.favorites, serializeFavorites(favorites));

  const emit = (what) => listeners.forEach((fn) => fn(what));
  const saveCart = () => storage.write(STORAGE_KEYS.cart, serializeCart(cart));
  const saveFavs = () => storage.write(STORAGE_KEYS.favorites, serializeFavorites(favorites));

  function commitCart(next) {
    if (next === cart) return;
    cart = next; saveCart(); emit("cart");
  }

  return {
    catalog, recovered,
    get persistent() { return storage.persistent; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getCart: () => cart,
    summary: () => Cart.summarize(cart, catalog),
    qty: (id) => Cart.qtyOf(cart, id),
    left: (id) => Cart.stockLeft(cart, catalog, id),

    add(id, qty = 1) { const r = Cart.addItem(cart, catalog, id, qty); commitCart(r.state); return r; },
    addMany(wanted) { const r = Cart.addMany(cart, catalog, wanted); commitCart(r.state); return r; },
    setQty(id, qty) { commitCart(Cart.setQty(cart, catalog, id, qty)); },
    remove(id) { commitCart(Cart.removeItem(cart, id)); },
    clear() { commitCart(Cart.clearCart(cart)); },
    // «Отменить» удаление: вернуть позиции [{ id, qty }], не затрагивая остальное.
    reinstate(entries) { commitCart(Cart.reinstate(cart, catalog, entries)); },
    applyPromo(code) { const r = Cart.applyPromo(cart, code); commitCart(r.state); return r; },
    removePromo() { commitCart(Cart.removePromo(cart)); },

    favorites: () => new Set(favorites),
    isFavorite: (id) => favorites.includes(id),
    toggleFavorite(id) {
      if (!catalog.has(id)) return false;
      favorites = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
      saveFavs(); emit("favorites");
      return favorites.includes(id);
    },
  };
}
