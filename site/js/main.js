import { PRODUCTS } from "./data/products.js";
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

const storage = createStorage();
const store = createStore({ products: PRODUCTS, storage });

document.querySelectorAll("dialog").forEach((d) => setupDialog(d));

const cart = initCart({ store, onCheckout: (opener) => openCheckout(opener) });
const openCheckout = initCheckout({ store });
const openQuick = initQuickView({ store });
const catalog = initCatalog({ store, products: PRODUCTS, onQuickView: openQuick });
initExpedition({ store, products: PRODUCTS, storage, openCart: (opener) => { closeDialog($("#passport-dialog")); cart.open(opener); } });
initInfo();

// Шапка: «Избранное» — переключает показ избранного в каталоге.
$("#fav-open").addEventListener("click", () => {
  const on = catalog.showFavorites();
  scrollToEl($("#catalog"));
  toast(on ? "Показано только избранное." : "Показаны все товары.", { silent: false });
});

// Витрина: короткие факты из реального каталога.
const prices = PRODUCTS.map((p) => p.price);
const cats = new Set(PRODUCTS.map((p) => p.category)).size;
$("#hero-stats").innerHTML = [
  [PRODUCTS.length, "изделий"], [cats, "категории"], [3, "направления"], [formatRub(Math.min(...prices)), "минимальная цена"],
].map(([v, k]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

if (store.recovered) toast("Сохранённые данные были повреждены — корзина и избранное сброшены.", { kind: "error" });
if (!store.persistent) toast("Хранилище браузера недоступно: корзина будет работать только до перезагрузки страницы.", { kind: "info", timeout: 7000 });
