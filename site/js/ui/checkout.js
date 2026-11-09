// Учебное «оформление»: без платёжных данных. Показывает состав и очищает корзину.
import { $, esc, icon } from "./dom.js";
import { formatRub } from "../core/money.js";
import { openDialog, closeDialog } from "./dialogs.js";
import { announce } from "./toast.js";

export function initCheckout({ store, onClosed }) {
  const dlg = $("#checkout-dialog"), body = $("#checkout-body");
  let counter = 0;

  function renderSummary() {
    const s = store.summary();
    body.innerHTML = `<div class="prose">
      <p class="note"><strong>Учебный режим.</strong> Настоящей оплаты нет, платёжные и личные данные не запрашиваются и не сохраняются.</p>
      <ul class="co-lines" aria-label="Состав заказа">${s.lines.map((l) => `<li><span>${esc(l.product.name)} × ${l.qty}</span><span>${formatRub(l.lineTotal)}</span></li>`).join("")}</ul>
      <dl class="sum">
        <div><dt>Товары</dt><dd>${formatRub(s.subtotal)}</dd></div>
        <div><dt>Скидка${s.promo ? " " + esc(s.promo.code) : ""}</dt><dd>${s.discount ? "−" + formatRub(s.discount) : formatRub(0)}</dd></div>
        <div class="sum__total"><dt>К оплате</dt><dd>${formatRub(s.total)}</dd></div>
      </dl>
      <button type="button" class="btn btn--primary btn--block" id="co-confirm">Подтвердить учебный заказ</button>
      <button type="button" class="btn btn--outline btn--block" data-close>Вернуться в корзину</button></div>`;
  }

  body.addEventListener("click", (e) => {
    if (!e.target.closest("#co-confirm")) return;
    const s = store.summary();
    if (!s.lines.length) { closeDialog(dlg); return; }
    counter += 1;
    const id = `УЧ-${String(s.count * 100 + s.total % 1000 + counter).padStart(5, "0")}`;
    const paid = formatRub(s.total);
    store.clear(); store.removePromo();
    body.innerHTML = `<div class="co-done">${icon("check", "i--xl")}<h3>Учебный заказ оформлен</h3>
      <p class="co-id">№ ${id}</p>
      <p>Сумма условного заказа: ${paid}. Ничего не списано, товары не отправлены — это демонстрация сценария.</p>
      <button type="button" class="btn btn--dark" data-close>Закрыть</button></div>`;
    announce(`Учебный заказ ${id} оформлен. Оплата не производилась.`);
    $("[data-close].btn", body)?.focus();
  });

  return (opener) => { renderSummary(); openDialog(dlg, opener); };
}
