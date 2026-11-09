// Каталог с бэкенда (GET ./api/catalog) с безопасным откатом на встроенные данные.
// Любой сбой (нет сети, 404, таймаут, неверный формат) — сайт работает на встроенном каталоге.
const isStr = (v) => typeof v === "string" && v.length > 0;
const isInt = (v, min) => Number.isInteger(v) && v >= min;

function validProduct(p) {
  return p && typeof p === "object"
    && isStr(p.id) && isStr(p.sku) && isStr(p.category) && isStr(p.name) && isStr(p.short) && isStr(p.description)
    && isInt(p.price, 1) && isInt(p.mass, 0) && isInt(p.stock, 0) && Number.isFinite(p.popularity)
    && isStr(p.image) && p.image.startsWith("./assets/") && !p.image.includes("..")
    && Array.isArray(p.specs) && p.specs.every((s) => Array.isArray(s) && s.length === 2 && isStr(s[0]) && isStr(s[1]));
}

// -> { products, promos } | null (если пригодных товаров нет)
export function normalizeApiCatalog(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.products)) return null;
  const seen = new Set();
  const products = raw.products.filter((p) => validProduct(p) && !seen.has(p.id) && seen.add(p.id));
  if (!products.length) return null;
  const promos = {};
  if (raw.promos && typeof raw.promos === "object") {
    for (const [code, v] of Object.entries(raw.promos)) {
      if (/^[A-Z0-9_-]{1,32}$/.test(code) && v && isInt(v.percent, 1) && v.percent <= 90 && isStr(v.label)) promos[code] = { percent: v.percent, label: v.label };
    }
  }
  return { products, promos: Object.keys(promos).length ? promos : null };
}

export async function loadCatalog({ fallback, fetchFn = globalThis.fetch, url = "./api/catalog", timeoutMs = 2500 }) {
  const builtin = { products: fallback.products, promos: fallback.promos, source: "builtin" };
  if (typeof fetchFn !== "function") return builtin;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return builtin;
    const data = normalizeApiCatalog(await res.json());
    if (!data) return builtin;
    return { products: data.products, promos: data.promos ?? fallback.promos, source: "api" };
  } catch {
    return builtin;
  } finally {
    clearTimeout(timer);
  }
}
