// «Паспорт экспедиции»: карточка рисуется как SVG из данных набора.
// Тот же SVG показывается в окне, печатается и скачивается (SVG и PNG).
import { esc } from "./dom.js";
import { formatRub, formatMass, plural } from "../core/money.js";
import { CATEGORIES } from "../data/products.js";

const W = 900;
const SANS = `'Helvetica Neue',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,'SF Mono',Menlo,Consolas,monospace`;
const SERIF = `'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif`;
const INK = "#efe8dc", DIM = "#a8a297", OR = "#ff5a1f", BG = "#14151a", LINE = "rgba(239,232,220,.28)";

function wrap(text, max) {
  const words = text.split(" "), lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

export function buildPassportSVG({ info, items, totals, number, date }) {
  const rows = items.length;
  const descLines = wrap(info.text, 70);
  const listTop = 640 + (descLines.length - 3) * 28;
  const rowH = 48;
  const totalsTop = listTop + 70 + rows * rowH + 24;
  const H = totalsTop + 260;
  const bars = [...number].map((c, i) => ((c.charCodeAt(0) * (i + 3)) % 5) + 1);
  let bx = 0;
  const barcode = bars.map((w, i) => { const x = bx; bx += w * 2 + 3; return i % 1 === 0 ? `<rect x="${x}" y="0" width="${w * 2}" height="44" fill="${INK}"/>` : ""; }).join("");

  const list = items.map((it, i) => {
    const y = listTop + 70 + i * rowH;
    const cat = CATEGORIES.find((c) => c.id === it.product.category)?.name ?? "";
    return `<g transform="translate(70 ${y})">
      <line x1="0" y1="${rowH}" x2="${W - 140}" y2="${rowH}" stroke="${LINE}"/>
      <text x="0" y="30" font-family="${MONO}" font-size="15" fill="${OR}" letter-spacing="1">${esc(it.product.sku)}</text>
      <text x="96" y="30" font-family="${SANS}" font-size="${it.product.name.length > 26 ? 19 : 23}" font-weight="700" fill="${INK}">${esc(it.product.name)}</text>
      <text x="${W - 140 - 130}" y="30" font-family="${MONO}" font-size="17" fill="${DIM}" text-anchor="end">${it.qty} × ${esc(formatRub(it.product.price))}</text>
      <text x="${W - 140}" y="30" font-family="${MONO}" font-size="20" font-weight="700" fill="${INK}" text-anchor="end">${esc(formatRub(it.product.price * it.qty))}</text>
      <title>${esc(cat)}</title>
    </g>`;
  }).join("");

  const nbsp = / /g;
  const label = `Паспорт экспедиции ${number}: ${info.title}. Состав: ${items.map((i) => `${i.product.name} — ${i.qty} шт.`).join("; ")}. Стоимость ${formatRub(totals.cost).replace(nbsp, " ")}, масса ${formatMass(totals.mass).replace(nbsp, " ")}.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
  <title>Паспорт экспедиции ${esc(number)}</title>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="22" y="22" width="${W - 44}" height="${H - 44}" fill="none" stroke="${LINE}" stroke-width="2"/>
  <g stroke="${INK}" stroke-width="2" fill="none"><path d="M22 52V22h30M${W - 52} 22h30v30M22 ${H - 52}v30h30M${W - 52} ${H - 22}h30v-30"/></g>

  <g transform="translate(70 88)">
    <circle cx="20" cy="0" r="19" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="20" cy="0" r="6" fill="${OR}"/>
    <text x="56" y="10" font-family="${SANS}" font-size="30" font-weight="800" letter-spacing="5" fill="${INK}">ОРБИТА</text>
  </g>
  <text x="${W - 70}" y="84" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${DIM}" text-anchor="end">ПАСПОРТ ЭКСПЕДИЦИИ</text>
  <text x="${W - 70}" y="108" font-family="${MONO}" font-size="15" letter-spacing="1" fill="${DIM}" text-anchor="end">ВЫДАН ${esc(date)}</text>

  <line x1="70" y1="140" x2="${W - 70}" y2="140" stroke="${LINE}"/>
  <text x="70" y="182" font-family="${MONO}" font-size="18" letter-spacing="2" fill="${OR}">№ ${esc(number)}</text>

  <g transform="rotate(-18 770 250)" fill="none" stroke="${INK}" stroke-opacity=".5" stroke-width="1.5">
    <ellipse cx="770" cy="250" rx="112" ry="38" stroke-dasharray="4 8"/>
  </g>
  <circle cx="770" cy="250" r="30" fill="#25282d" stroke="${INK}" stroke-opacity=".6" stroke-width="1.5"/>
  <circle cx="${770 + 104}" cy="${250 - 30}" r="8" fill="${OR}"/>

  <text x="64" y="330" font-family="${SANS}" font-size="${Math.min(170, Math.floor(560 / info.dest.big.length * 1.55))}" font-weight="800" letter-spacing="-3" fill="${INK}">${esc(info.dest.big)}</text>
  <text x="70" y="378" font-family="${SERIF}" font-size="30" font-style="italic" fill="${INK}">${esc(info.dest.name)} · ${esc(info.duration.name)}</text>

  <g transform="translate(70 424)" font-family="${MONO}">
    ${[["НАПРАВЛЕНИЕ", info.dest.name, 0], ["СРОК", info.duration.name, 1], ["ПРИОРИТЕТ", info.priority.name, 2]].map(([k, v, i]) =>
      `<g transform="translate(${i * 252} 0)"><line x1="0" y1="0" x2="232" y2="0" stroke="${INK}" stroke-width="2"/><text x="0" y="28" font-size="13" letter-spacing="2" fill="${DIM}">${k}</text><text x="0" y="58" font-family="${SANS}" font-size="${v.length > 14 ? 21 : 26}" font-weight="700" fill="${INK}">${esc(v)}</text></g>`).join("")}
  </g>

  <g font-family="${SANS}" font-size="21" fill="${DIM}">
    ${descLines.map((l, i) => `<text x="70" y="${540 + i * 30}">${esc(l)}</text>`).join("")}
  </g>

  <g transform="translate(0 ${listTop})">
    <text x="70" y="26" font-family="${MONO}" font-size="14" letter-spacing="3" fill="${DIM}">СОСТАВ НАБОРА · ${rows} ${plural(rows, ["ПОЗИЦИЯ", "ПОЗИЦИИ", "ПОЗИЦИЙ"])}</text>
    <line x1="70" y1="46" x2="${W - 70}" y2="46" stroke="${INK}" stroke-width="2"/>
  </g>
  ${list}

  <g transform="translate(70 ${totalsTop})" font-family="${MONO}">
    <text x="0" y="22" font-size="13" letter-spacing="2" fill="${DIM}">ЕДИНИЦ В НАБОРЕ</text><text x="0" y="62" font-family="${SANS}" font-size="36" font-weight="800" fill="${INK}">${totals.count}</text>
    <text x="230" y="22" font-size="13" letter-spacing="2" fill="${DIM}">МАССА</text><text x="230" y="62" font-family="${SANS}" font-size="36" font-weight="800" fill="${INK}">${esc(formatMass(totals.mass))}</text>
    <text x="${W - 140}" y="22" font-size="13" letter-spacing="2" fill="${DIM}" text-anchor="end">СТОИМОСТЬ</text><text x="${W - 140}" y="68" font-family="${SANS}" font-size="46" font-weight="800" fill="${OR}" text-anchor="end">${esc(formatRub(totals.cost))}</text>
  </g>

  <g transform="translate(70 ${H - 126})">
    <g transform="translate(0 0)">${barcode}</g>
    <text x="0" y="68" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${DIM}">${esc(number)}</text>
  </g>
  <g font-family="${MONO}" font-size="13" fill="${DIM}" text-anchor="end">
    <text x="${W - 70}" y="${H - 94}">УЧЕБНЫЙ ПРОЕКТ</text>
    <text x="${W - 70}" y="${H - 72}">Бренд, товары и экспедиция вымышлены</text>
  </g>
</svg>`;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadSVG(svg, name) {
  saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
}

export function downloadPNG(svg, name, scale = 2) {
  return new Promise((resolve, reject) => {
    const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const w = +m[1], h = +m[2];
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w * scale; canvas.height = h * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("toBlob"));
          saveBlob(blob, `${name}.png`); resolve();
        }, "image/png");
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("image"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

export function printPassport(svg) {
  const root = document.getElementById("print-root");
  root.innerHTML = svg;
  const clean = () => { root.innerHTML = ""; window.removeEventListener("afterprint", clean); };
  window.addEventListener("afterprint", clean);
  window.print();
}
