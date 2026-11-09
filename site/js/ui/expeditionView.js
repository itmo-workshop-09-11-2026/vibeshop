// «Собери экспедицию»: пошаговый сценарий, рекомендации из каталога, добавление набора, паспорт.
import { $, $$, esc, icon } from "./dom.js";
import { DESTINATIONS, DURATIONS, PRIORITIES } from "../data/expedition.js";
import { recommend, kitTotals, describeExpedition, passportNumber } from "../core/expedition.js";
import { sanitizeExpedition, serializeExpedition } from "../core/sanitize.js";
import { formatRub, formatMass, plural } from "../core/money.js";
import { STORAGE_KEYS } from "../config.js";
import { openDialog } from "./dialogs.js";
import { toast, announce } from "./toast.js";
import { buildPassportSVG, downloadPNG, downloadSVG, printPassport } from "./passport.js";

const STEPS = ["Направление", "Срок", "Приоритет", "Комплект"];

export function initExpedition({ store, products, storage, openCart }) {
  const root = $("#exp-app");
  const sel = sanitizeExpedition(storage.read(STORAGE_KEYS.expedition).value);
  let step = 1;
  let excluded = new Set();
  let kit = [];
  let lastAdd = null; // результат последнего добавления набора

  const save = () => storage.write(STORAGE_KEYS.expedition, serializeExpedition(sel));

  function stepsHtml() {
    return `<ol class="exp__steps" aria-label="Шаги подбора">${STEPS.map((name, i) => {
      const n = i + 1;
      return `<li><button type="button" class="exp__step${n < step ? " is-done" : ""}" data-step="${n}" ${n === step ? 'aria-current="step"' : ""}><b aria-hidden="true">${n < step ? "✓" : n}</b><span>${name}</span><span class="sr-only">${n === step ? " (текущий шаг)" : n < step ? " (выполнен)" : ""}</span></button></li>`;
    }).join("")}</ol>`;
  }

  function optionsHtml() {
    if (step === 1) return DESTINATIONS.map((d) => `<label class="opt"><input type="radio" name="dest" value="${d.id}" ${sel.dest === d.id ? "checked" : ""}><span class="opt__box"><span class="opt__top">${icon(d.icon)}<span class="opt__mark">${icon("check")}Выбрано</span></span><span class="opt__name">${esc(d.name)}</span><span class="opt__desc">${esc(d.tagline)}</span></span></label>`).join("");
    if (step === 2) return DURATIONS.map((d) => `<label class="opt"><input type="radio" name="days" value="${d.days}" ${sel.days === d.days ? "checked" : ""}><span class="opt__box"><span class="opt__top"><span class="opt__big">${d.days}<small>${plural(d.days, ["день", "дня", "дней"])}</small></span><span class="opt__mark">${icon("check")}Выбрано</span></span><span class="opt__desc">${esc(d.phrase)}</span></span></label>`).join("");
    return PRIORITIES.map((p) => `<label class="opt"><input type="radio" name="priority" value="${p.id}" ${sel.priority === p.id ? "checked" : ""}><span class="opt__box"><span class="opt__top">${icon(p.icon)}<span class="opt__mark">${icon("check")}Выбрано</span></span><span class="opt__name">${esc(p.name)}</span><span class="opt__desc">${esc(p.hint)}</span></span></label>`).join("");
  }

  const QUESTIONS = ["Куда отправляемся?", "На сколько дней?", "Что для вас важнее всего?"];

  function renderChoice() {
    root.innerHTML = `${stepsHtml()}
      <div class="exp__panel" id="exp-panel" tabindex="-1" role="group" aria-labelledby="exp-q">
        <p class="eyebrow">Шаг ${step} из 3</p>
        <fieldset class="exp__fs">
          <legend><h3 class="exp__q" id="exp-q">${QUESTIONS[step - 1]}</h3></legend>
          <div class="opts">${optionsHtml()}</div>
        </fieldset>
        <div class="exp__nav">
          ${step > 1 ? `<button type="button" class="btn btn--ghost" data-nav="back">${icon("back")}Назад</button>` : "<span></span>"}
          <button type="button" class="btn btn--primary" data-nav="next">${step < 3 ? "Далее" : "Показать набор"} ${icon("arrow")}</button>
        </div>
      </div>`;
  }

  function rowHtml(it) {
    const off = excluded.has(it.id);
    return `<li class="kit__row${off ? " is-off" : ""}" data-id="${it.id}">
      <label class="kit__check"><input type="checkbox" data-include="${it.id}" ${off ? "" : "checked"} aria-label="Включить в набор: ${esc(it.product.name)}"><span aria-hidden="true">${icon("check")}</span></label>
      <img class="kit__img" src="${esc(it.product.image)}" alt="" width="72" height="72">
      <div>
        <p class="kit__name">${esc(it.product.name)}</p>
        <p class="kit__qty">${it.qty} шт. × ${formatRub(it.product.price)}</p>
        <p class="kit__why">${esc(it.why)}</p>
      </div>
      <p class="kit__sum">${formatRub(it.product.price * it.qty)}<small>${formatMass(it.product.mass * it.qty)}</small></p>
    </li>`;
  }

  function renderKit() {
    kit = recommend(sel, products);
    const info = describeExpedition(sel);
    root.innerHTML = `${stepsHtml()}
      <div class="exp__panel" id="exp-panel" tabindex="-1" role="group" aria-labelledby="exp-q">
        <div class="kit__head">
          <p class="eyebrow">Ваша экспедиция</p>
          <h3 class="kit__title" id="exp-q">${esc(info.title)}</h3>
          <p class="kit__text">${esc(info.text)}</p>
          <div class="kit__chips">
            <button type="button" class="kit__chip" data-step="1">${icon(info.dest.icon)}${esc(info.dest.name)} <small>изменить</small></button>
            <button type="button" class="kit__chip" data-step="2">${icon("box")}${esc(info.duration.name)} <small>изменить</small></button>
            <button type="button" class="kit__chip" data-step="3">${icon(info.priority.icon)}${esc(info.priority.name)} <small>изменить</small></button>
          </div>
          <ul class="kit__facts prose" style="list-style:none;padding:0;color:var(--ink-dim);font-size:.9rem">${info.dest.facts.map((f) => `<li>· ${esc(f)}</li>`).join("")}</ul>
        </div>
        <div class="kit__layout">
          <div>
            <h4 class="sr-only">Состав набора</h4>
            <ul class="kit__list" id="kit-list">${kit.map(rowHtml).join("")}</ul>
            <p class="kit__hint" style="margin-top:12px;font-size:.85rem;color:var(--ink-dim)">Снимите галочку, чтобы исключить позицию из набора.</p>
          </div>
          <aside class="kit__aside" aria-label="Итоги набора">
            <dl class="kit__totals" id="kit-totals"></dl>
            <button type="button" class="btn btn--primary btn--block" id="kit-add">${icon("cart")}Добавить набор в корзину</button>
            <button type="button" class="btn btn--ghost btn--block" id="kit-passport">Паспорт экспедиции</button>
            <div class="kit__result" id="kit-result" hidden></div>
          </aside>
        </div>
        <div class="exp__nav"><button type="button" class="btn btn--ghost" data-nav="back">${icon("back")}Изменить параметры</button><span></span></div>
      </div>`;
    updateTotals();
    if (lastAdd) renderResult(lastAdd);
  }

  function updateTotals() {
    const t = kitTotals(kit, excluded);
    $("#kit-totals").innerHTML = `
      <div class="kit__total-main"><dt>Стоимость</dt><dd>${formatRub(t.cost)}</dd></div>
      <div><dt>Масса</dt><dd>${formatMass(t.mass)}</dd></div>
      <div><dt>Позиций</dt><dd>${t.positions} · ${t.count} шт.</dd></div>`;
    const none = t.positions === 0;
    for (const id of ["kit-add", "kit-passport"]) { const b = $("#" + id); b.disabled = none; }
    let msg = $("#kit-empty");
    if (none && !msg) $("#kit-list").insertAdjacentHTML("afterend", `<p class="kit__empty" id="kit-empty">Все позиции исключены. Верните хотя бы одну, чтобы добавить набор или получить паспорт.</p>`);
    if (!none && msg) msg.remove();
    return t;
  }

  function renderResult(r) {
    const el = $("#kit-result");
    const parts = [];
    if (r.added === 0) parts.push(`<strong>Ничего не добавлено.</strong> Весь доступный остаток этих товаров уже лежит в вашей корзине.`);
    else if (r.complete) parts.push(`<strong>Набор добавлен в корзину:</strong> ${r.results.length} ${plural(r.results.length, ["позиция", "позиции", "позиций"])}, ${r.added} шт.`);
    else parts.push(`<strong>Добавлено частично: ${r.added} из ${r.requested} шт.</strong> Остатки на складе ограничены.`);
    const lacking = r.results.filter((x) => x.added < x.requested);
    if (lacking.length) {
      parts.push(`<ul>${lacking.map((x) => {
        const p = store.catalog.get(x.id);
        return `<li>«${esc(p.name)}»: добавлено ${x.added} из ${x.requested}${p.stock === 0 ? " — нет в наличии" : ` — на складе ${p.stock} шт., в корзине ${x.inCart}`}.</li>`;
      }).join("")}</ul>`);
    }
    el.hidden = false;
    el.dataset.kind = r.complete ? "ok" : "warn";
    el.innerHTML = `${parts.join("")}<button type="button" class="btn btn--ghost btn--block" id="kit-open-cart">Открыть корзину</button>`;
  }

  function addKit() {
    const t = kitTotals(kit, excluded);
    const r = store.addMany(t.active.map((i) => ({ id: i.id, qty: i.qty })));
    lastAdd = r;
    renderResult(r);
    const text = r.added === 0 ? "Ничего не добавлено: остатки уже в корзине."
      : r.complete ? `Набор добавлен в корзину: ${r.added} шт.`
      : `Набор добавлен частично: ${r.added} из ${r.requested} шт. Подробности под кнопкой.`;
    toast(text, { kind: r.complete ? "success" : "error" });
  }

  const pDlg = $("#passport-dialog"), pBody = $("#passport-body");
  function openPassport(opener) {
    const t = kitTotals(kit, excluded);
    if (!t.positions) return;
    const info = describeExpedition(sel);
    const number = passportNumber(sel, t.active);
    const svg = buildPassportSVG({ info, items: t.active, totals: t, number, date: new Date().toLocaleDateString("ru-RU") });
    const name = `orbita-passport-${number}`;
    pBody.innerHTML = `<div class="passport-wrap">
      <div class="passport-card">${svg}</div>
      <div class="passport-actions">
        <button type="button" class="btn btn--primary" data-p="png">${icon("download")}Скачать PNG</button>
        <button type="button" class="btn btn--outline" data-p="svg">${icon("download")}Скачать SVG</button>
        <button type="button" class="btn btn--outline" data-p="print">${icon("print")}Печать</button>
      </div>
      <p class="passport-note">Паспорт описывает набор из подбора, даже если часть позиций не удалось добавить в корзину из-за остатков. Это учебный документ вымышленной экспедиции.</p></div>`;
    pBody.onclick = async (e) => {
      const b = e.target.closest("[data-p]"); if (!b) return;
      if (b.dataset.p === "svg") { downloadSVG(svg, name); toast("Паспорт сохранён в SVG.", { kind: "success" }); }
      else if (b.dataset.p === "print") printPassport(svg);
      else {
        try { await downloadPNG(svg, name); toast("Паспорт сохранён в PNG.", { kind: "success" }); }
        catch { toast("Не удалось создать PNG. Скачайте SVG или используйте печать.", { kind: "error" }); }
      }
    };
    openDialog(pDlg, opener);
  }

  function go(n, focus = true) {
    step = n;
    n === 4 ? renderKit() : renderChoice();
    if (focus) {
      $("#exp-panel").focus({ preventScroll: true });
      $("#exp-panel").scrollIntoView({ block: "nearest" });
    }
    announce(n === 4 ? `Шаг 4: комплект. ${describeExpedition(sel).title}.` : `Шаг ${n} из 3: ${QUESTIONS[n - 1]}`);
  }

  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "dest") sel.dest = t.value;
    else if (t.name === "days") sel.days = Number(t.value);
    else if (t.name === "priority") sel.priority = t.value;
    else if (t.dataset.include) {
      if (t.checked) excluded.delete(t.dataset.include); else excluded.add(t.dataset.include);
      t.closest(".kit__row").classList.toggle("is-off", !t.checked);
      lastAdd = null; $("#kit-result").hidden = true;
      const tt = updateTotals();
      announce(`Набор: ${tt.positions} ${plural(tt.positions, ["позиция", "позиции", "позиций"])}, ${formatRub(tt.cost)}, ${formatMass(tt.mass)}.`);
      return;
    } else return;
    excluded = new Set(); lastAdd = null; // новые параметры — новый набор
    save();
  });

  root.addEventListener("click", (e) => {
    const s = e.target.closest("[data-step]");
    if (s) { go(Number(s.dataset.step)); return; }
    const nav = e.target.closest("[data-nav]");
    if (nav) { go(nav.dataset.nav === "back" ? (step === 4 ? 1 : step - 1) : step + 1); return; }
    if (e.target.closest("#kit-add")) addKit();
    else if (e.target.closest("#kit-passport")) openPassport(e.target.closest("#kit-passport"));
    else if (e.target.closest("#kit-open-cart")) openCart(e.target.closest("#kit-open-cart"));
  });

  go(1, false);
  return { selection: () => ({ ...sel }) };
}
