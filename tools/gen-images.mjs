// Генератор собственных SVG-иллюстраций товаров (единый стиль: графит, бумага, оранжевый).
// Запуск: node tools/gen-images.mjs  →  site/assets/products/*.svg
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../site/assets/products");
mkdirSync(OUT, { recursive: true });

const C = { bg: "#e7e0d1", ink: "#1b1d21", paper: "#f7f2e7", graph: "#34373d", or: "#ff5a1f", orD: "#c9400f", orL: "#ff9a63", grey: "#bdb5a4", greyD: "#8f8878", sage: "#8a9a74" };
const S = `stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const thin = `stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round" fill="none"`;

// Если у тега повторяется атрибут (базовый стиль + локальная правка), остаётся последний.
function dedupeAttrs(svg) {
  return svg.replace(/<[a-z][^>]*>/g, (tag) => {
    const re = /\s([a-z-]+)="[^"]*"/g;
    const last = new Map();
    for (const m of tag.matchAll(re)) last.set(m[1], m.index);
    return tag.replace(re, (m, name, offset) => (last.get(name) === offset ? m : ""));
  });
}

function frame(inner, { shadow = true } = {}) {
  let grid = "";
  for (let i = 40; i < 400; i += 40) grid += `<path d="M${i} 0V400M0 ${i}H400"/>`;
  const mark = (x, y) => `<path d="M${x - 8} ${y}H${x + 8}M${x} ${y - 8}V${y + 8}" ${thin}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img">
<rect width="400" height="400" fill="${C.bg}"/>
<g stroke="${C.ink}" stroke-opacity=".07" stroke-width="1" fill="none">${grid}</g>
${mark(28, 28)}${mark(372, 28)}${mark(28, 372)}${mark(372, 372)}
${shadow ? `<ellipse cx="200" cy="344" rx="104" ry="9" fill="${C.ink}" opacity=".13"/>` : ""}
${inner}
</svg>
`;
}

// Изометрический куб: центр верхней грани (x,y), сторона s
function cube(x, y, s, fills = [C.orL, C.or, C.orD]) {
  const dx = s * 0.87, dy = s * 0.5;
  const top = `${x},${y - dy} ${x + dx},${y} ${x},${y + dy} ${x - dx},${y}`;
  const left = `${x - dx},${y} ${x},${y + dy} ${x},${y + dy + s} ${x - dx},${y + s}`;
  const right = `${x + dx},${y} ${x},${y + dy} ${x},${y + dy + s} ${x + dx},${y + s}`;
  return `<g ${S} stroke-width="2.4"><polygon points="${top}" fill="${fills[0]}"/><polygon points="${left}" fill="${fills[1]}"/><polygon points="${right}" fill="${fills[2]}"/></g>`;
}

const art = {
  "mango-cubes": () => `
    <g transform="rotate(-4 200 250)">
      <path d="M130 250h140v70q0 12-12 12H142q-12 0-12-12z" fill="${C.paper}" ${S}/>
      <rect x="124" y="232" width="152" height="22" rx="5" fill="${C.graph}" ${S}/>
      <rect x="146" y="272" width="108" height="34" rx="3" fill="none" ${S} stroke-width="2"/>
      <path d="M160 289h80" ${thin}/>
    </g>
    ${cube(200, 150, 38)}${cube(124, 124, 26)}${cube(278, 104, 30, [C.paper, C.orL, C.or])}${cube(300, 178, 20)}${cube(96, 190, 18, [C.paper, C.orL, C.or])}
    <g ${thin}><path d="M200 214v-14M150 160l8 10M246 140l-6 10M318 130l8-4" stroke-dasharray="3 5"/></g>`,

  espresso: () => `
    <ellipse cx="200" cy="318" rx="108" ry="20" fill="${C.grey}" ${S}/>
    <path d="M120 218h160l-18 92q-3 14-18 14h-88q-15 0-18-14z" fill="${C.paper}" ${S}/>
    <path d="M276 236q46-2 40 28t-52 28" fill="none" ${S} stroke-width="9"/>
    <path d="M276 236q46-2 40 28t-52 28" fill="none" stroke="${C.paper}" stroke-width="3"/>
    <path d="M128 252h144l-5 26H133z" fill="${C.or}" ${S} stroke-width="2.4"/>
    <text x="200" y="272" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="18" font-weight="700" text-anchor="middle" fill="${C.paper}">T – 10</text>
    <ellipse cx="200" cy="218" rx="80" ry="12" fill="${C.graph}" ${S}/>
    <circle cx="200" cy="140" r="34" fill="${C.graph}" ${S}/>
    <path d="M178 128q8-14 24-14" fill="none" stroke="${C.paper}" stroke-width="5" stroke-linecap="round"/>
    <g ${thin} stroke-dasharray="3 5"><path d="M200 180v22M160 170l-18 22M240 170l18 22"/></g>`,

  "borsch-tube": () => `
    <g transform="rotate(-22 200 200)">
      <path d="M72 158l16-6v96l-16-6z" fill="${C.grey}" ${S}/>
      <path d="M88 150h150l30 28v44l-30 28H88z" fill="${C.paper}" ${S}/>
      <g ${thin}><path d="M76 160v76M80 158v80M84 156v84"/></g>
      <path d="M268 178h30v44h-30z" fill="${C.grey}" ${S}/>
      <rect x="298" y="170" width="52" height="60" rx="8" fill="${C.or}" ${S}/>
      <g ${thin} stroke="${C.ink}"><path d="M310 176v48M322 176v48M334 176v48"/></g>
      <rect x="112" y="160" width="130" height="80" rx="4" fill="${C.or}" ${S} stroke-width="2.4"/>
      <circle cx="177" cy="206" r="24" fill="${C.paper}" ${S} stroke-width="2.4"/>
      <path d="M163 206a14 14 0 0 0 28 0z" fill="${C.orD}"/>
      <path d="M170 192q-4-6 0-10M178 192q-4-6 0-10M186 192q-4-6 0-10" ${thin} stroke="${C.ink}"/>
    </g>`,

  "gel-bars": () => {
    const bar = (rot, x, y, accent) => `<g transform="rotate(${rot} ${x} ${y})">
      <rect x="${x - 100}" y="${y - 34}" width="200" height="68" rx="4" fill="${C.paper}" ${S}/>
      <g ${thin}>${Array.from({ length: 9 }, (_, i) => `<path d="M${x - 100} ${y - 30 + i * 8}h-7M${x + 100} ${y - 30 + i * 8}h7"/>`).join("")}</g>
      <rect x="${x - 70}" y="${y - 12}" width="140" height="24" fill="${accent}" ${S} stroke-width="2.2"/>
      <path d="M${x - 60} ${y}h40M${x + 20} ${y}h40" stroke="${C.paper}" stroke-width="3"/>
    </g>`;
    return bar(14, 190, 270, C.graph) + bar(-8, 210, 205, C.or) + bar(-24, 200, 140, C.graph);
  },

  flashlight: () => `
    <g transform="rotate(-32 200 210)">
      <path d="M262 168l62-34v152l-62-34z" fill="${C.paper}" ${S} opacity=".0"/>
      <g ${thin} stroke-dasharray="2 6">${[-52, -26, 0, 26, 52].map((d) => `<path d="M330 210 L400 ${210 + d * 1.6}"/>`).join("")}</g>
      <path d="M250 168h30l30-26v136l-30-26h-30z" fill="${C.graph}" ${S}/>
      <path d="M280 168l30-26v136l-30-26z" fill="${C.paper}" ${S}/>
      <ellipse cx="310" cy="210" rx="6" ry="68" fill="${C.orL}" ${S}/>
      <rect x="110" y="178" width="140" height="64" rx="10" fill="${C.graph}" ${S}/>
      <g ${thin} stroke="${C.grey}" stroke-width="2.2">${Array.from({ length: 8 }, (_, i) => `<path d="M${126 + i * 14} 184v52"/>`).join("")}</g>
      <rect x="236" y="172" width="16" height="76" rx="3" fill="${C.or}" ${S}/>
      <path d="M110 186h-26q-10 0-10 10v28q0 10 10 10h26z" fill="${C.graph}" ${S}/>
      <circle cx="94" cy="210" r="7" fill="${C.or}" ${S} stroke-width="2"/>
    </g>
    <g ${thin}><circle cx="86" cy="88" r="3"/><circle cx="130" cy="58" r="2"/><circle cx="64" cy="140" r="2"/></g>`,

  greenhouse: () => `
    <path d="M110 300h180v26q0 10-10 10H120q-10 0-10-10z" fill="${C.graph}" ${S}/>
    <rect x="122" y="312" width="156" height="4" fill="${C.or}"/>
    <path d="M116 300V210a84 84 0 0 1 168 0v90z" fill="${C.paper}" fill-opacity=".55" ${S}/>
    <path d="M142 214a58 58 0 0 1 36-48" fill="none" stroke="${C.paper}" stroke-width="6" stroke-linecap="round"/>
    <rect x="126" y="268" width="148" height="32" fill="${C.greyD}" ${S} stroke-width="2.4"/>
    <g ${thin} stroke="${C.ink}"><path d="M142 276v16M160 278v14M180 275v17M200 277v15M220 275v17M240 278v14M258 276v16"/></g>
    <path d="M200 268V198" fill="none" ${S} stroke-width="4"/>
    <path d="M200 232q-44-4-48-42 40 2 48 42z" fill="${C.sage}" ${S} stroke-width="2.4"/>
    <path d="M200 214q42-6 46-42-38 6-46 42z" fill="${C.sage}" ${S} stroke-width="2.4"/>
    <path d="M200 198q-16-12-12-34 18 8 12 34z" fill="${C.orL}" ${S} stroke-width="2.4"/>
    <circle cx="200" cy="120" r="5" fill="${C.or}"/><path d="M188 104l-8-8M212 104l8-8M200 100v-10" ${thin} stroke="${C.or}" stroke-width="2.4"/>`,

  "meteor-kit": () => `
    <g ${thin} stroke-width="1.4" stroke-dasharray="2 6"><path d="M300 40L250 112M340 70l-40 60"/></g>
    <g stroke="${C.ink}" stroke-width="3" stroke-linecap="round"><path d="M92 52l54 38" opacity=".5"/><path d="M130 40l46 30" opacity=".35"/></g>
    <circle cx="150" cy="92" r="6" fill="${C.or}" ${S} stroke-width="2"/><circle cx="178" cy="72" r="5" fill="${C.or}" ${S} stroke-width="2"/>
    <g stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"><path d="M196 230L142 336M204 232l8 106M212 230l56 104"/></g>
    <g transform="rotate(-28 200 200)">
      <rect x="100" y="178" width="160" height="40" rx="6" fill="${C.paper}" ${S}/>
      <rect x="236" y="172" width="44" height="52" rx="6" fill="${C.graph}" ${S}/>
      <rect x="84" y="184" width="22" height="28" rx="4" fill="${C.graph}" ${S}/>
      <rect x="150" y="174" width="12" height="48" fill="${C.or}" ${S} stroke-width="2.4"/>
      <rect x="166" y="174" width="6" height="48" fill="${C.or}" ${S} stroke-width="2.4"/>
      <path d="M60 192h24v16H60z" fill="${C.grey}" ${S} stroke-width="2.4"/>
    </g>
    <rect x="198" y="226" width="22" height="14" rx="3" fill="${C.graph}" ${S} stroke-width="2.4"/>
    <rect x="286" y="280" width="64" height="48" rx="3" fill="${C.paper}" ${S} stroke-width="2.4" transform="rotate(8 318 304)"/>
    <g transform="rotate(8 318 304)"><circle cx="318" cy="304" r="12" ${thin}/><path d="M300 304h36M318 286v36" ${thin} stroke-width="1"/><circle cx="326" cy="298" r="2.4" fill="${C.or}"/></g>`,

  multitool: () => {
    const blade = (a, len, w, fill, tip) => `<g transform="rotate(${a} 128 270)"><path d="M128 ${270 - w / 2}h${len}${tip}v${w}H128z" fill="${fill}" ${S} stroke-width="2.6"/><circle cx="${128 + len - 14}" cy="270" r="2.2" fill="${C.ink}"/></g>`;
    return `
    ${blade(-80, 130, 22, C.grey, "")}
    ${blade(-56, 150, 20, C.grey, "")}
    ${blade(-32, 160, 24, C.or, "")}
    ${blade(-8, 148, 18, C.grey, "")}
    <rect x="70" y="244" width="250" height="56" rx="14" fill="${C.graph}" ${S}/>
    <g ${thin} stroke="${C.grey}" stroke-width="2.2">${Array.from({ length: 10 }, (_, i) => `<path d="M${112 + i * 18} 256v32"/>`).join("")}</g>
    <circle cx="128" cy="270" r="11" fill="${C.paper}" ${S}/><circle cx="128" cy="270" r="3.5" fill="${C.ink}"/>
    <rect x="296" y="254" width="12" height="36" rx="3" fill="${C.or}" ${S} stroke-width="2.4"/>`;
  },

  "thermo-blanket": () => `
    <rect x="80" y="262" width="240" height="56" rx="10" fill="${C.graph}" ${S}/>
    <rect x="92" y="222" width="216" height="58" rx="10" fill="${C.grey}" ${S}/>
    <rect x="76" y="168" width="248" height="68" rx="10" fill="${C.paper}" ${S}/>
    <g ${thin}>${Array.from({ length: 12 }, (_, i) => `<path d="M${96 + i * 18} 176l-6 52"/>`).join("")}</g>
    <circle cx="214" cy="202" r="30" fill="${C.graph}" ${S}/>
    <circle cx="228" cy="196" r="26" fill="${C.paper}"/>
    <path d="M186 232l-14 6M310 262h-16" ${thin}/>
    <path d="M264 120q22-32 56-26-22 12-26 40-18-2-30-14z" fill="${C.or}" ${S} stroke-width="2.4"/>
    <g ${thin} stroke="${C.ink}"><path d="M120 150l-6-12M150 142l-2-14M178 150l4-12" stroke-dasharray="2 5"/></g>`,

  "mag-mug": () => `
    <rect x="96" y="326" width="208" height="14" rx="4" fill="${C.graph}" ${S}/>
    <g ${thin} stroke="${C.or}" stroke-width="2.4" stroke-dasharray="4 5"><path d="M130 322v-14M170 322v-14M230 322v-14M270 322v-14"/></g>
    <path d="M110 140h160v160q0 8-8 8H118q-8 0-8-8z" fill="${C.paper}" ${S}/>
    <path d="M270 170q56-4 54 42t-54 46" fill="none" ${S} stroke-width="14"/>
    <path d="M270 170q56-4 54 42t-54 46" fill="none" stroke="${C.paper}" stroke-width="6"/>
    <rect x="110" y="272" width="160" height="36" fill="${C.graph}" ${S} stroke-width="2.6"/>
    <rect x="110" y="140" width="160" height="22" rx="6" fill="${C.graph}" ${S}/>
    <path d="M168 190v34a22 22 0 0 0 44 0v-34" fill="none" ${S} stroke-width="8"/>
    <path d="M168 190v14M212 190v14" stroke="${C.or}" stroke-width="8" stroke-linecap="round"/>
    <g ${thin}><path d="M150 112q-6-12 0-22M190 112q-6-12 0-22M230 112q-6-12 0-22"/></g>`,

  "gravity-socks": () => {
    const sock = (tx, rot, fill, band) => `<g transform="translate(${tx} 0) rotate(${rot} 200 220)">
      <path d="M150 80h70v130q0 24 20 34l40 20q18 10 8 34-8 14-28 14h-62q-34 0-48-26z" fill="${fill}" ${S}/>
      <rect x="146" y="72" width="78" height="30" rx="4" fill="${C.graph}" ${S}/>
      <g ${thin} stroke="${C.paper}" stroke-width="2.4">${[88, 96].map((y) => `<path d="M152 ${y}h66"/>`).join("")}</g>
      <rect x="150" y="130" width="70" height="18" fill="${band}" stroke="${C.ink}" stroke-width="2.4"/>
      <circle cx="206" cy="304" r="9" fill="${C.graph}" ${S} stroke-width="2.4"/>
      <path d="M206 296v10m-4-4l4 4 4-4" fill="none" stroke="${C.paper}" stroke-width="2"/>
    </g>`;
    return sock(-38, -6, C.paper, C.or) + sock(54, 8, C.grey, C.graph);
  },

  "sleep-mask": () => `
    <path d="M30 196q40-28 90-24" fill="none" ${S} stroke-width="14"/>
    <path d="M370 196q-40-28-90-24" fill="none" ${S} stroke-width="14"/>
    <path d="M30 196q40-28 90-24M370 196q-40-28-90-24" fill="none" stroke="${C.grey}" stroke-width="6" stroke-linecap="round"/>
    <path d="M90 160Q200 130 310 160Q338 168 330 212Q324 266 260 266Q228 266 216 244Q200 220 184 244Q172 266 140 266Q76 266 70 212Q62 168 90 160Z" fill="${C.graph}" ${S}/>
    <path d="M102 222Q112 246 140 246Q162 246 174 230M226 230Q238 246 260 246Q288 246 298 222" fill="none" stroke="${C.paper}" stroke-width="2.4" stroke-dasharray="2 6"/>
    <path d="M160 214a40 40 0 0 1 80 0z" fill="${C.or}" ${S} stroke-width="2.4"/>
    <g ${thin} stroke="${C.or}" stroke-width="3"><path d="M200 164v-10M166 174l-7-7M234 174l7-7M144 202h-10M256 202h10"/></g>
    <circle cx="146" cy="224" r="3" fill="${C.paper}"/><circle cx="254" cy="224" r="3" fill="${C.paper}"/>`,

  "scent-capsule": () => `
    <g ${thin} stroke-width="2.2"><path d="M96 120q14-14 0-28t0-28M136 100q14-14 0-28t0-28" stroke-dasharray="1 0"/><path d="M270 100q-14-14 0-28t0-28M310 124q-14-14 0-28t0-28"/></g>
    <g transform="rotate(-34 200 214)">
      <path d="M120 214v-34a40 40 0 0 1 40-40h40v148h-40a40 40 0 0 1-40-40z" fill="${C.paper}" ${S}/>
      <path d="M200 140h40a40 40 0 0 1 40 40v68a40 40 0 0 1-40 40h-40z" fill="${C.or}" ${S}/>
      <path d="M200 140v148" ${S}/>
      <circle cx="224" cy="214" r="17" fill="${C.paper}" ${S} stroke-width="2.4"/>
      <path d="M224 204v20M214 214h20" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M134 176a32 32 0 0 1 22-26" fill="none" stroke="${C.bg}" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g ${S} stroke-width="2.4"><path d="M92 300q18-26 38-12-8 26-38 12z" fill="${C.sage}"/><circle cx="318" cy="298" r="10" fill="${C.orL}"/><path d="M306 332q12-14 24 0z" fill="${C.grey}"/></g>`,

  patch: () => `
    <circle cx="200" cy="200" r="132" fill="${C.graph}" ${S}/>
    <circle cx="200" cy="200" r="116" fill="none" stroke="${C.paper}" stroke-width="3" stroke-dasharray="6 5"/>
    <circle cx="200" cy="200" r="88" fill="${C.paper}" ${S} stroke-width="2.6"/>
    <circle cx="200" cy="220" r="46" fill="${C.graph}" ${S} stroke-width="2.6"/>
    <path d="M168 196q20-8 40 2M162 214q28-10 58 2M164 234q30-8 62 2" fill="none" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <ellipse cx="200" cy="200" rx="108" ry="34" fill="none" stroke="${C.or}" stroke-width="5" transform="rotate(-24 200 200)"/>
    <circle cx="289" cy="161" r="11" fill="${C.or}" ${S} stroke-width="2.6"/>
    <path d="M70 300q130 62 260 0" fill="none"/>
    <g fill="${C.paper}"><circle cx="112" cy="132" r="3"/><circle cx="140" cy="108" r="2"/><circle cx="256" cy="108" r="2.4"/></g>`,

  postcards: () => {
    const card = (rot, x, y, fill) => `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x - 100}" y="${y - 66}" width="200" height="132" rx="4" fill="${fill}" ${S}/></g>`;
    return card(-14, 190, 236, C.grey) + card(8, 214, 220, C.graph) + card(-3, 200, 196, C.paper) + `
    <g transform="rotate(-3 200 196)">
      <path d="M200 140v112" ${thin} stroke-width="1.4"/>
      <circle cx="144" cy="196" r="34" fill="${C.graph}" ${S} stroke-width="2.4"/>
      <path d="M124 186q14 10 8 24t14 22M156 166q-6 14 8 20t4 20" fill="none" stroke="${C.paper}" stroke-width="3" stroke-linecap="round"/>
      <rect x="252" y="146" width="36" height="44" fill="${C.or}" ${S} stroke-width="2.2"/>
      <circle cx="270" cy="168" r="9" fill="${C.paper}" ${S} stroke-width="2"/>
      <g ${thin} stroke-width="1.6"><path d="M216 214h72M216 226h72M216 238h48"/></g>
    </g>`;
  },

  "station-model": () => `
    <g ${S}>
      <rect x="22" y="132" width="100" height="136" fill="${C.graph}" stroke-width="2.6"/>
      <rect x="278" y="132" width="100" height="136" fill="${C.graph}" stroke-width="2.6"/>
    </g>
    <g stroke="${C.orL}" stroke-width="1.8" fill="none">${[1, 2, 3].map((i) => `<path d="M${22 + i * 25} 132v136M${278 + i * 25} 132v136"/>`).join("")}${[1, 2, 3].map((i) => `<path d="M22 ${132 + i * 34}h100M278 ${132 + i * 34}h100"/>`).join("")}</g>
    <path d="M122 200h42M236 200h42" ${S} stroke-width="6"/>
    <rect x="156" y="164" width="88" height="72" rx="10" fill="${C.paper}" ${S}/>
    <rect x="164" y="112" width="18" height="52" fill="${C.grey}" ${S} stroke-width="2.4"/>
    <rect x="218" y="236" width="18" height="52" fill="${C.grey}" ${S} stroke-width="2.4"/>
    <circle cx="200" cy="200" r="16" fill="${C.or}" ${S} stroke-width="2.6"/>
    <path d="M200 112V96m0 0h-12m12 0h12" ${thin}/>`,
};

for (const [id, draw] of Object.entries(art)) {
  writeFileSync(path.join(OUT, `${id}.svg`), dedupeAttrs(frame(draw(), { shadow: !["sleep-mask", "station-model", "patch", "meteor-kit"].includes(id) })));
}
console.log(`Готово: ${Object.keys(art).length} иллюстраций → ${OUT}`);
