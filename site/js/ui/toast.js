// Уведомления: видимые тосты + озвучивание для скринридеров.
// Тост показывается внутри открытого диалога (чтобы не прятаться под ним и не перекрывать
// кнопки), иначе — в углу страницы.
import { $, esc, icon } from "./dom.js";
import { UNDO_MS } from "../config.js";

let polite, assertive;

export function announce(message, { assertive: loud = false } = {}) {
  polite ??= $("#live-polite");
  assertive ??= $("#live-assertive");
  const region = loud ? assertive : polite;
  region.textContent = "";
  // Пустая запись → текст: так одинаковые сообщения озвучиваются повторно.
  setTimeout(() => { region.textContent = message; }, 40);
}

function host() {
  return $("dialog[open] [data-toast-host]") ?? $("#toasts");
}

export function toast(message, { kind = "info", action, timeout, silent = false } = {}) {
  if (!silent) announce(message, { assertive: kind === "error" });
  const el = document.createElement("div");
  el.className = "toast";
  el.dataset.kind = kind;
  const ic = kind === "error" ? "alert" : kind === "success" ? "check" : "info";
  el.innerHTML = `${icon(ic)}<span class="toast__msg">${esc(message)}</span>`;
  let timer;
  const close = () => { clearTimeout(timer); el.remove(); };
  if (action) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "toast__btn";
    b.innerHTML = `${icon("undo")}${esc(action.label)}`;
    b.addEventListener("click", () => { close(); action.onClick(); });
    el.append(b);
  }
  const x = document.createElement("button");
  x.type = "button"; x.className = "toast__x"; x.setAttribute("aria-label", "Закрыть уведомление");
  x.innerHTML = icon("close");
  x.addEventListener("click", close);
  el.append(x);

  const h = host();
  h.append(el);
  while (h.children.length > 3) h.firstElementChild.remove();
  const ms = timeout ?? (action ? UNDO_MS : kind === "error" ? 6000 : 3500);
  const start = () => { timer = setTimeout(close, ms); };
  start();
  // Не исчезает, пока на него наведён курсор или фокус.
  el.addEventListener("pointerenter", () => clearTimeout(timer));
  el.addEventListener("pointerleave", () => { clearTimeout(timer); start(); });
  el.addEventListener("focusin", () => clearTimeout(timer));
  el.addEventListener("focusout", () => { clearTimeout(timer); start(); });
  return { close, el };
}

// Убрать тосты, привязанные к диалогу, когда он закрывается.
export function clearToasts(root) {
  root.querySelectorAll(".toast").forEach((t) => t.remove());
}
