// Модальные окна на <dialog>: Escape, закрытие по фону, ловушка фокуса, возврат фокуса.
import { $$ } from "./dom.js";
import { clearToasts } from "./toast.js";

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function focusables(dlg) {
  return $$(FOCUSABLE, dlg).filter((el) => !el.closest("[hidden]") && el.getClientRects().length > 0);
}

const openers = new WeakMap();

export function setupDialog(dlg, { onClose } = {}) {
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close(); // клик по затемнению
    if (e.target.closest("[data-close]")) dlg.close();
  });
  dlg.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const list = focusables(dlg);
    if (!list.length) { e.preventDefault(); return; }
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  dlg.addEventListener("close", () => {
    clearToasts(dlg);
    if (!$$("dialog[open]").length) document.documentElement.classList.remove("modal-open");
    const opener = openers.get(dlg);
    openers.delete(dlg);
    if (opener && opener.isConnected && !opener.disabled) opener.focus({ preventScroll: true });
    onClose?.();
  });
}

export function openDialog(dlg, opener = document.activeElement) {
  if (dlg.open) return;
  openers.set(dlg, opener instanceof HTMLElement ? opener : null);
  document.documentElement.classList.add("modal-open");
  dlg.showModal();
}

export function closeDialog(dlg) { if (dlg.open) dlg.close(); }
