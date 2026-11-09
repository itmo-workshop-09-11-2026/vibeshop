import { animateFeedback, promoFeedback } from "./motion.js";
// Корзина (выдвижная панель): позиции, количество, промокод, итоги, отмена удаления.
import { $, $$, esc, icon } from "./dom.js";
import { formatRub, plural } from "../core/money.js";
import { openDialog, closeDialog } from "./dialogs.js";
import { toast, announce } from "./toast.js";
import { scrollToEl } from "./dom.js";

export function initCart({ store, onCheckout }) {
  const dlg = $("#cart-dialog"), body = $("#cart-body"), foot = $("#cart-foot");
  const countEl = $("#cart-count"), sumEl = $("#cart-sum"), btn = $("#cart-open");
  let promoMsg = null; // { kind, text }

  function renderHeader(s) {
    const prev = countEl.textContent;
    countEl.textContent = s.count;
    sumEl.textContent = formatRub(s.total);
    btn.setAttribute("aria-label", `Корзина: ${s.count} ${plural(s.count, ["единица", "единицы", "единиц"])}, к оплате ${formatRub(s.total)}`);
    if (String(s.count) !== prev) {
      animateFeedback(countEl, [{ transform: "scale(1)" }, { transform: "scale(1.28)" }, { transform: "scale(1)" }]);
      btn.classList.add("bump");
      setTimeout(() => btn.classList.remove("bump"), 220);
    }
  }

  function lineHtml(l) {
    const p = l.product, n = esc(p.name), atMax = l.qty >= p.stock;
    return `<li class="line" data-id="${p.id}">
      <img class="line__img" src="${esc(p.image)}" alt="" width="76" height="76">
      <div class="line__main">
        <p class="line__name">${n}</p>
        <p class="line__unit">${formatRub(p.price)} / шт.</p>
        <div class="qty" role="group" aria-label="Количество: ${n}">
          <button type="button" data-act="dec" aria-label="Уменьшить количество: ${n}" ${l.qty <= 1 ? "disabled" : ""}>${icon("minus")}</button>
          <span class="qty__n" aria-label="В корзине: ${l.qty}">${l.qty}</span>
          <button type="button" data-act="inc" aria-label="Увеличить количество: ${n}" ${atMax ? "disabled" : ""}>${icon("plus")}</button>
        </div>
        ${atMax ? `<p class="line__limit">Максимум: на складе ${p.stock} шт.</p>` : ""}
      </div>
      <div class="line__side">
        <p class="line__total" aria-label="Сумма по позиции ${formatRub(l.lineTotal)}">${formatRub(l.lineTotal)}</p>
        <button type="button" class="icon-btn" data-act="remove" aria-label="Удалить из корзины: ${n}">${icon("trash")}</button>
      </div>
    </li>`;
  }

  function render(focusHint) {
    const s = store.summary();
    renderHeader(s);
    if (!s.lines.length) {
      body.innerHTML = `<div class="cart-empty">${icon("cart")}<h3>Корзина пуста</h3><p>Добавьте товары из каталога или соберите готовый набор для экспедиции.</p><button type="button" class="btn btn--dark" data-act="to-catalog">Перейти в каталог ${icon("arrow")}</button></div>`;
      foot.innerHTML = `<dl class="sum"><div class="sum__total"><dt>К оплате</dt><dd>${formatRub(0)}</dd></div></dl>`;
    } else {
      body.innerHTML = `<ul class="cart-lines" aria-label="Товары в корзине">${s.lines.map(lineHtml).join("")}</ul>`;
      const applied = s.promo;
      foot.innerHTML = `
        <form class="promo" id="promo-form" novalidate>
          <label for="promo-input">Промокод</label>
          <div class="promo__row">
            <input id="promo-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ORBIT10" aria-describedby="promo-msg">
            <button type="submit" class="btn btn--outline">Применить</button>
          </div>
          <p class="promo__msg" id="promo-msg" data-kind="${promoMsg?.kind ?? ""}">${promoMsg ? esc(promoMsg.text) : ""}</p>
          ${applied ? `<div class="promo__applied"><span>${esc(applied.code)} · −${applied.percent}%</span><button type="button" class="link-btn" data-act="promo-remove">Убрать промокод</button></div>` : ""}
        </form>
        <dl class="sum">
          <div><dt>Товары (${s.count} шт.)</dt><dd>${formatRub(s.subtotal)}</dd></div>
          <div><dt>Скидка${applied ? ` ${esc(applied.code)}` : ""}</dt><dd>${s.discount ? "−" + formatRub(s.discount) : formatRub(0)}</dd></div>
          <div class="sum__total"><dt>К оплате</dt><dd>${formatRub(s.total)}</dd></div>
        </dl>
        <div class="cart-actions">
          <button type="button" class="btn btn--primary btn--block" data-act="checkout">Оформить (учебный режим)</button>
          <div class="cart-actions__row"><button type="button" class="btn btn--outline" data-act="clear">${icon("trash")}Очистить корзину</button></div>
        </div>`;
    }
    if (focusHint) restoreFocus(focusHint);
  }

  function restoreFocus({ id, act, fallbackIndex }) {
    let el = $(`.line[data-id="${id}"] [data-act="${act}"]:not(:disabled)`, body)
      ?? $(`.line[data-id="${id}"] [data-act="${act === "inc" ? "dec" : "inc"}"]:not(:disabled)`, body)
      ?? $(`.line[data-id="${id}"] [data-act="remove"]`, body);
    if (!el && fallbackIndex !== undefined) {
      const rows = $$(".line", body);
      el = rows[Math.min(fallbackIndex, rows.length - 1)]?.querySelector('[data-act="remove"]');
    }
    el ??= $('[data-act="to-catalog"]', body) ?? $("[data-close]", dlg);
    el?.focus();
  }

  function undoToast(text, entries) {
    toast(text, { kind: "info", action: { label: "Отменить", onClick: () => {
      store.reinstate(entries);
      announce("Удаление отменено.");
      const first = $(`.line[data-id="${entries[0].id}"] [data-act="remove"]`, body);
      first?.focus();
    } } });
  }

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const row = b.closest(".line"), id = row?.dataset.id, act = b.dataset.act;
    const product = id ? store.catalog.get(id) : null;
    if (act === "to-catalog") { closeDialog(dlg); scrollToEl($("#catalog")); return; }
    if (act === "inc") {
      const before = store.qty(id);
      store.setQty(id, before + 1);
      if (store.qty(id) === before) toast(`На складе только ${product.stock} шт.`, { kind: "error" });
      else announce(`«${product.name}»: ${store.qty(id)} шт., сумма ${formatRub(product.price * store.qty(id))}. К оплате ${formatRub(store.summary().total)}.`);
      restoreFocus({ id, act: "inc" });
    } else if (act === "dec") {
      store.setQty(id, store.qty(id) - 1);
      announce(`«${product.name}»: ${store.qty(id)} шт., сумма ${formatRub(product.price * store.qty(id))}. К оплате ${formatRub(store.summary().total)}.`);
      restoreFocus({ id, act: "dec" });
    } else if (act === "remove") {
      const index = $$(".line", body).indexOf(row), qty = store.qty(id);
      store.remove(id);
      restoreFocus({ id, act: "remove", fallbackIndex: index });
      undoToast(`«${product.name}» удалён из корзины.`, [{ id, qty }]);
    }
  });

  foot.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act;
    if (act === "clear") {
      const entries = store.summary().lines.map((l) => ({ id: l.id, qty: l.qty }));
      store.clear();
      $("[data-close]", dlg).focus();
      undoToast(`Корзина очищена (позиций: ${entries.length}).`, entries);
    } else if (act === "promo-remove") {
      store.removePromo(); promoMsg = { kind: "ok", text: "Промокод убран." }; render();
      announce("Промокод убран."); $("#promo-input")?.focus();
    } else if (act === "checkout") {
      onCheckout(b);
    }
  });

  foot.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#promo-input", foot);
    const r = store.applyPromo(input.value);
    promoMsg = { kind: r.ok ? "ok" : "error", text: r.message };
    render();
    promoFeedback(foot, r.ok);
    announce(r.message, { assertive: !r.ok });
    const next = $("#promo-input", foot);
    if (!r.ok) { next.value = input.value; next.focus(); next.setAttribute("aria-invalid", "true"); } else next.focus();
  });

  store.subscribe((what) => {
    if (what !== "cart") return;
    // Промокод исчезает из сообщения при смене состава корзины.
    render();
  });
  $("#cart-open").addEventListener("click", (e) => { promoMsg = null; render(); openDialog(dlg, e.currentTarget); });
  render();

  return { open: (opener) => { promoMsg = null; render(); openDialog(dlg, opener); }, close: () => closeDialog(dlg), render };
}
