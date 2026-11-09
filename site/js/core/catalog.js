// Фильтрация, поиск и сортировка каталога — независимо от отображения.
export const SORTS = [
  { id: "popular", name: "Сначала популярные" },
  { id: "price-asc", name: "Сначала дешёвые" },
  { id: "price-desc", name: "Сначала дорогие" },
];

export const normalizeText = (s) => String(s ?? "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

export function filterProducts(products, { query = "", category = "all", sort = "popular", favoritesOnly = false } = {}, favorites = new Set()) {
  const q = normalizeText(query);
  let list = products.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (favoritesOnly && !favorites.has(p.id)) return false;
    if (q && !normalizeText(p.name).includes(q)) return false;
    return true;
  });
  const byId = (a, b) => (a.id < b.id ? -1 : 1);
  const cmp = {
    popular: (a, b) => b.popularity - a.popularity || byId(a, b),
    "price-asc": (a, b) => a.price - b.price || b.popularity - a.popularity || byId(a, b),
    "price-desc": (a, b) => b.price - a.price || b.popularity - a.popularity || byId(a, b),
  }[sort] ?? ((a, b) => b.popularity - a.popularity || byId(a, b));
  list = [...list].sort(cmp);
  return list;
}
