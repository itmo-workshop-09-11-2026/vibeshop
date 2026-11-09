export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

export const icon = (name, cls = "") => `<svg class="i ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function scrollToEl(el) {
  el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
}
