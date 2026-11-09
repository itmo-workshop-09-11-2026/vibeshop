// Экспортирует каталог и промокоды в backend/app/catalog.json.
// Единый источник данных — site/js/data/products.js и site/js/config.js.
// Запуск: node tools/export-catalog.mjs   (npm run export:catalog)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PRODUCTS, CATEGORIES } from "../site/js/data/products.js";
import { PROMO_CODES } from "../site/js/config.js";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backend/app/catalog.json");
writeFileSync(out, JSON.stringify({ categories: CATEGORIES, products: PRODUCTS, promos: PROMO_CODES }, null, 2) + "\n");
console.log(`Готово: ${PRODUCTS.length} товаров → ${out}`);
