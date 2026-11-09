// Каталог: фильтры, сетка карточек, кнопки «в корзину» и «в избранное».
import { $, $$, esc, icon } from "./dom.js";
import { CATEGORIES } from "../data/products.js";
import { filterProducts, SORTS } from "../core/catalog.js";
import { formatRub, plural } from "../core/money.js";
import { toast } from "./toast.js";

export function stockLabel(p, inCart = 0) {
  if (p.stock === 0) return "Нет в наличии";
  const base = p.stock <= 5 ? `Осталось ${p.stock} шт.` : `В наличии: ${p.stock} шт.`;
  return inCart ? `${base} · в корзине: ${inCart}` : base;
}

// Единое состояние кнопки «В корзину» для карточки и быстрого просмотра.
export function syncAddButton(btn, store, p) {
  const left = store.left(p.id);
  btn.dataset.id = p.id;
  if (btn.classList.contains("is-done")) return; // идёт подтверждение «Добавлено»
  if (p.stock === 0) { btn.disabled = true; btn.textContent = "Нет в наличии"; }
  else if (left === 0) { btn.disabled = true; btn.textContent = "Весь остаток в корзине"; }
  else { btn.disabled = false; btn.innerHTML = `${icon("cart")}В корзину`; }
}

export function flashAdded(btn, store, p) {
  btn.classList.add("is-done");
  btn.disabled = false;
  btn.innerHTML = `${icon("check")}Добавлено`;
  setTimeout(() => {
    btn.classList.remove("is-done");
    if (btn.isConnected) syncAddButton(btn, store, p);
  }, 1300);
}

// Добавление одного товара с сообщением о результате.
export function addToCart(store, p, btn) {
  const r = store.add(p.id, 1);
  if (r.added > 0) {
    if (btn) flashAdded(btn, store, p);
    const n = store.qty(p.id);
    toast(`«${p.name}» добавлен в корзину (в корзине: ${n}).`, { kind: "success" });
  } else {
    toast(r.reason === "stock" && p.stock > 0 ? `Больше нельзя: на складе только ${p.stock} шт.` : `«${p.name}» сейчас нет в наличии.`, { kind: "error" });
    if (btn) syncAddButton(btn, store, p);
  }
  return r;
}

export function initCatalog({ store, products, onQuickView, onFavoritesChange }) {
  const filters = { query: "", category: "all", sort: "popular", favoritesOnly: false };
  const grid = $("#grid"), emptyEl = $("#empty"), countEl = $("#result-count");
  const search = $("#search"), sortEl = $("#sort"), catsEl = $("#cats");
  const favOnlyBtn = $("#fav-only"), headerFav = $("#fav-open"), resetBtn = $("#reset-filters");
  const byId = new Map(products.map((p) => [p.id, p]));

  sortEl.innerHTML = SORTS.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");

  function renderCats() {
    const fav = store.favorites();
    const base = filterProducts(products, { query: filters.query, favoritesOnly: filters.favoritesOnly }, fav);
    const countIn = (id) => base.filter((p) => id === "all" || p.category === id).length;
    catsEl.innerHTML = [{ id: "all", name: "Все товары" }, ...CATEGORIES].map((c) =>
      `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${filters.category === c.id}">${esc(c.name)} <span class="chip__n">${countIn(c.id)}</span></button>`
    ).join("");
  }

  function cardHtml(p, feature) {
    const cat = CATEGORIES.find((c) => c.id === p.category)?.name ?? "";
    const fav = store.isFavorite(p.id);
    const badge = p.stock === 0 ? `<span class="badge badge--out">Нет в наличии</span>` : p.stock <= 5 ? `<span class="badge">Осталось ${p.stock}</span>` : "";
    return `<li class="card${feature ? " card--feature" : ""}${p.stock === 0 ? " is-out" : ""}" data-id="${p.id}">
      <article aria-label="${esc(p.name)}">
        <div class="card__media">
          <button type="button" class="card__open" data-open="${p.id}" aria-label="Быстрый просмотр: ${esc(p.name)}"><img src="${esc(p.image)}" alt="" width="400" height="400" decoding="async"></button>
          <span class="card__sku">${esc(p.sku)}</span>
          <button type="button" class="fav" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${fav ? "Убрать из избранного" : "Добавить в избранное"}: ${esc(p.name)}">${icon("heart")}</button>
          ${badge}
        </div>
        <div class="card__body">
          <p class="card__cat">${esc(cat)}</p>
          <h3 class="card__title"><button type="button" data-open="${p.id}">${esc(p.name)}</button></h3>
          <p class="card__short">${esc(p.short)}</p>
          <div class="card__buy">
            <p class="price">${formatRub(p.price)}</p>
            <button type="button" class="btn btn--primary btn--add" data-add="${p.id}" aria-label="Добавить в корзину: ${esc(p.name)}, ${formatRub(p.price)}"></button>
          </div>
          <p class="card__stock" data-stock="${p.id}"></p>
        </div>
      </article></li>`;
  }

  function syncCards() {
    $$("[data-add]", grid).forEach((b) => syncAddButton(b, store, byId.get(b.dataset.add)));
    $$("[data-stock]", grid).forEach((el) => { const p = byId.get(el.dataset.stock); el.textContent = stockLabel(p, store.qty(p.id)); });
  }

  function syncFavs() {
    $$("[data-fav]", grid).forEach((b) => {
      const p = byId.get(b.dataset.fav), on = store.isFavorite(p.id);
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", `${on ? "Убрать из избранного" : "Добавить в избранное"}: ${p.name}`);
    });
    const n = store.favorites().size;
    $("#fav-count").textContent = n;
    headerFav.setAttribute("aria-label", `Избранное: ${n} ${plural(n, ["товар", "товара", "товаров"])}. ${filters.favoritesOnly ? "Показано только избранное" : "Показать только избранное"}`);
    headerFav.setAttribute("aria-pressed", String(filters.favoritesOnly));
    favOnlyBtn.setAttribute("aria-pressed", String(filters.favoritesOnly));
    favOnlyBtn.innerHTML = `${icon("heart")} Только избранное (${n})`;
  }

  const isDefault = () => !filters.query.trim() && filters.category === "all" && !filters.favoritesOnly;

  function render() {
    const list = filterProducts(products, filters, store.favorites());
    const feature = isDefault() && filters.sort === "popular" && list.length >= 5;
    grid.innerHTML = list.map((p, i) => cardHtml(p, feature && i === 0)).join("");
    renderCats();
    syncCards(); syncFavs();
    const total = products.length;
    countEl.textContent = list.length === total && isDefault() ? `Товаров: ${total}` : `Найдено: ${list.length} из ${total}`;
    const none = list.length === 0;
    emptyEl.hidden = !none; grid.hidden = none;
    if (none) {
      if (filters.favoritesOnly && !store.favorites().size && isDefault()) {
        $("#empty-title").textContent = "В избранном пока пусто";
        $("#empty-text").textContent = "Нажмите на сердечко у товара, чтобы сохранить его здесь.";
      } else {
        $("#empty-title").textContent = "Ничего не найдено";
        $("#empty-text").textContent = "Проверьте запрос, выберите другую категорию или сбросьте фильтры.";
      }
    }
    resetBtn.hidden = isDefault() && filters.sort === "popular";
  }

  function reset() {
    filters.query = ""; filters.category = "all"; filters.sort = "popular"; filters.favoritesOnly = false;
    search.value = ""; sortEl.value = "popular";
    render();
  }

  $("#toolbar").addEventListener("submit", (e) => e.preventDefault());
  search.addEventListener("input", () => { filters.query = search.value; render(); });
  sortEl.addEventListener("change", () => { filters.sort = sortEl.value; render(); });
  catsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]"); if (!b) return;
    filters.category = b.dataset.cat; render();
    $(`[data-cat="${filters.category}"]`, catsEl)?.focus();
  });
  const toggleFavOnly = () => { filters.favoritesOnly = !filters.favoritesOnly; render(); };
  favOnlyBtn.addEventListener("click", () => { toggleFavOnly(); favOnlyBtn.focus(); });
  resetBtn.addEventListener("click", () => { reset(); search.focus(); });
  $("#empty-reset").addEventListener("click", () => { reset(); search.focus(); });

  grid.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) { onQuickView(byId.get(open.dataset.open), open); return; }
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      const p = byId.get(fav.dataset.fav);
      const on = store.toggleFavorite(p.id);
      toast(on ? `«${p.name}» добавлен в избранное.` : `«${p.name}» убран из избранного.`, { kind: "info" });
      if (filters.favoritesOnly && !on) { render(); (grid.hidden ? favOnlyBtn : $("[data-fav]", grid) ?? favOnlyBtn).focus(); }
      return;
    }
    const add = e.target.closest("[data-add]");
    if (add) addToCart(store, byId.get(add.dataset.add), add);
  });

  store.subscribe((what) => { if (what === "cart") syncCards(); if (what === "favorites") { syncFavs(); renderCats(); } });

  render();
  return {
    showFavorites() { filters.favoritesOnly = !filters.favoritesOnly; render(); return filters.favoritesOnly; },
    isFavoritesOnly: () => filters.favoritesOnly,
    reset, syncCards,
  };
}
