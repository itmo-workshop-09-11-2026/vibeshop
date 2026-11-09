// Форматирование денег и массы. Суммы — всегда целые рубли.
export function formatRub(value) {
  const n = Math.round(Number(value) || 0);
  const sign = n < 0 ? "−" : "";
  return `${sign}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₽`;
}

// Масса в граммах -> «120 г» / «1,85 кг»
export function formatMass(grams) {
  const g = Math.round(Number(grams) || 0);
  if (g < 1000) return `${g} г`;
  const kg = (g / 1000).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  return `${kg} кг`;
}

// Склонение: plural(5, ["товар","товара","товаров"])
export function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
