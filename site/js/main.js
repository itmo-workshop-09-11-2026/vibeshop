import { initMotion } from "./ui/motion.js";
import { PRODUCTS } from "./data/products.js";
import { PROMO_CODES } from "./config.js";
import { loadCatalog } from "./core/apiCatalog.js";
import { setPromoCodes } from "./core/promo.js";
import { createStorage } from "./core/storage.js";
import { createStore } from "./core/store.js";
import { formatRub } from "./core/money.js";
import { $, scrollToEl } from "./ui/dom.js";
import { setupDialog, closeDialog } from "./ui/dialogs.js";
import { toast } from "./ui/toast.js";
import { initCatalog } from "./ui/catalogView.js";
import { initQuickView } from "./ui/quickView.js";
import { initCart } from "./ui/cartView.js";
import { initExpedition } from "./ui/expeditionView.js";
import { initCheckout } from "./ui/checkout.js";
import { initInfo } from "./ui/infoView.js";

initMotion();

// Каталог и промокоды берём с бэкенда; если он недоступен — встроенные данные.
const catalogData = await loadCatalog({ fallback: { products: PRODUCTS, promos: PROMO_CODES } });
setPromoCodes(catalogData.promos);
const products = catalogData.products;
document.documentElement.dataset.catalog = catalogData.source; // "api" | "builtin"

const storage = createStorage();
const store = createStore({ products, storage });

document.querySelectorAll("dialog").forEach((d) => setupDialog(d));

const cart = initCart({ store, onCheckout: (opener) => openCheckout(opener) });
const openCheckout = initCheckout({ store });
const openQuick = initQuickView({ store });
const catalog = initCatalog({ store, products, onQuickView: openQuick });
initExpedition({ store, products, storage, openCart: (opener) => { closeDialog($("#passport-dialog")); cart.open(opener); } });
initInfo();

// Шапка: «Избранное» — переключает показ избранного в каталоге.
$("#fav-open").addEventListener("click", () => {
  const on = catalog.showFavorites();
  scrollToEl($("#catalog"));
  toast(on ? "Показано только избранное." : "Показаны все товары.", { silent: false });
});

// Витрина: короткие факты из реального каталога.
const prices = products.map((p) => p.price);
const cats = new Set(products.map((p) => p.category)).size;
$("#hero-stats").innerHTML = [
  [products.length, "изделий"], [cats, "категории"], [3, "направления"], [formatRub(Math.min(...prices)), "минимальная цена"],
].map(([v, k]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

if (store.recovered) toast("Сохранённые данные были повреждены — корзина и избранное сброшены.", { kind: "error" });
if (!store.persistent) toast("Хранилище браузера недоступно: корзина будет работать только до перезагрузки страницы.", { kind: "info", timeout: 7000 });
