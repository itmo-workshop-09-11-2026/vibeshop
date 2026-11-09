// Быстрый просмотр товара в диалоге.
import { $, esc, icon } from "./dom.js";
import { CATEGORIES } from "../data/products.js";
import { formatRub, formatMass } from "../core/money.js";
import { openDialog } from "./dialogs.js";
import { addToCart, stockLabel, syncAddButton } from "./catalogView.js";
import { toast } from "./toast.js";

export function initQuickView({ store }) {
  const dlg = $("#quick-dialog"), body = $("#quick-body");
  let current = null;

  function sync() {
    if (!current) return;
    const add = $("[data-qv-add]", body);
    if (add) syncAddButton(add, store, current);
    $("[data-qv-stock]", body).textContent = stockLabel(current, store.qty(current.id));
    const fav = $("[data-qv-fav]", body), on = store.isFavorite(current.id);
    fav.setAttribute("aria-pressed", String(on));
    fav.querySelector(".qv-fav-label").textContent = on ? "В избранном" : "В избранное";
    fav.classList.toggle("btn--dark", on);
    fav.classList.toggle("btn--outline", !on);
  }

  body.addEventListener("click", (e) => {
    if (!current) return;
    const add = e.target.closest("[data-qv-add]");
    if (add) addToCart(store, current, add);
    const fav = e.target.closest("[data-qv-fav]");
    if (fav) {
      const on = store.toggleFavorite(current.id);
      toast(on ? "Добавлено в избранное." : "Убрано из избранного.");
    }
  });
  store.subscribe(sync);

  return function open(p, opener) {
    current = p;
    const cat = CATEGORIES.find((c) => c.id === p.category)?.name ?? "";
    body.innerHTML = `<div class="qv">
      <div class="qv__media"><img src="${esc(p.image)}" alt="${esc(p.name)}: иллюстрация товара" width="400" height="400"></div>
      <div class="qv__info">
        <p class="qv__sku">${esc(p.sku)} · ${esc(cat)}</p>
        <h2 class="qv__title" id="quick-title">${esc(p.name)}</h2>
        <p class="qv__desc">${esc(p.description)}</p>
        <dl class="specs">${[...p.specs, ["Масса", formatMass(p.mass)]].filter((s, i, a) => a.findIndex((x) => x[0] === s[0]) === i).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <p class="qv__stock" data-qv-stock></p>
        <div class="qv__buy">
          <p class="price">${formatRub(p.price)}</p>
          <button type="button" class="btn btn--outline" data-qv-fav aria-pressed="false">${icon("heart")}<span class="qv-fav-label">В избранное</span></button>
          <button type="button" class="btn btn--primary" data-qv-add></button>
        </div>
      </div></div>`;
    sync();
    openDialog(dlg, opener);
  };
}
