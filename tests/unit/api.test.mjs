import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeApiCatalog, loadCatalog } from "../../site/js/core/apiCatalog.js";
import { PRODUCTS, CATEGORIES } from "../../site/js/data/products.js";
import { PROMO_CODES } from "../../site/js/config.js";
import { findPromo, setPromoCodes } from "../../site/js/core/promo.js";

const fallback = { products: PRODUCTS, promos: PROMO_CODES };
const good = { id: "x", sku: "Х-1", category: "food", name: "Х", short: "s", description: "d", price: 10, mass: 1, stock: 2, popularity: 5, image: "./assets/products/patch.svg", specs: [["a", "b"]] };
const resp = (body, ok = true) => async () => ({ ok, json: async () => body });

test("backend/app/catalog.json совпадает с products.js и config.js (запустите npm run export:catalog)", () => {
  const json = JSON.parse(readFileSync(new URL("../../backend/app/catalog.json", import.meta.url), "utf8"));
  assert.deepEqual(json, JSON.parse(JSON.stringify({ categories: CATEGORIES, products: PRODUCTS, promos: PROMO_CODES })));
});

test("normalizeApiCatalog: отбрасывает невалидное, не доверяет чужим картинкам", () => {
  const bad = [{ ...good, id: "a", price: 0 }, { ...good, id: "b", stock: -1 }, { ...good, id: "c", image: "https://evil/x.svg" },
    { ...good, id: "d", image: "./assets/../../etc" }, { ...good, id: "e", specs: [["a"]] }, null, 5, good, { ...good }];
  const r = normalizeApiCatalog({ products: bad, promos: { ORBIT10: { percent: 10, label: "x" }, bad: { percent: 10, label: "x" }, BIG: { percent: 99, label: "x" } } });
  assert.deepEqual(r.products.map((p) => p.id), ["x"]); // дубль id отброшен
  assert.deepEqual(Object.keys(r.promos), ["ORBIT10"]);
  assert.equal(normalizeApiCatalog({ products: [] }), null);
  assert.equal(normalizeApiCatalog(null), null);
  assert.equal(normalizeApiCatalog({ products: [good] }).promos, null);
});

test("loadCatalog: API → source=api; любой сбой → встроенные данные", async () => {
  const ok = await loadCatalog({ fallback, fetchFn: resp({ products: [good], promos: { SALE5: { percent: 5, label: "−5%" } } }) });
  assert.equal(ok.source, "api"); assert.equal(ok.products.length, 1); assert.ok(ok.promos.SALE5);
  for (const f of [resp({}, false), resp({ products: [] }), async () => { throw new Error("net"); }, undefined]) {
    const r = await loadCatalog({ fallback, fetchFn: f });
    assert.equal(r.source, "builtin"); assert.equal(r.products, PRODUCTS);
  }
  const slow = await loadCatalog({ fallback, timeoutMs: 20, fetchFn: (u, { signal }) => new Promise((_, rej) => signal.addEventListener("abort", () => rej(new Error("abort")))) });
  assert.equal(slow.source, "builtin");
});

