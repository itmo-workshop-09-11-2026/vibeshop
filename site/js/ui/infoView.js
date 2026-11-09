import { $ } from "./dom.js";
import { INFO } from "../data/info.js";
import { openDialog } from "./dialogs.js";

export function initInfo() {
  const dlg = $("#info-dialog");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-info]"); if (!b) return;
    const item = INFO[b.dataset.info]; if (!item) return;
    $("#info-title").textContent = item.title;
    $("#info-body").innerHTML = item.html;
    openDialog(dlg, b);
  });
}
