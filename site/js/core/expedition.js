// Подбор экспедиции: правила, зависящие от направления, срока и приоритета.
import { EXPEDITION_META, DESTINATIONS, DURATIONS, PRIORITIES } from "../data/expedition.js";

const byId = (list, key, value) => list.find((x) => x[key] === value);

// Сколько позиций рекомендуем: больше дней — больше позиций, лёгкий багаж — меньше.
export function kitSize(days, priority) {
  const base = days >= 14 ? 7 : days >= 7 ? 6 : 5;
  return priority === "light" ? base - 1 : base;
}

export function recommend({ dest, days, priority }, products) {
  const meta = EXPEDITION_META;
  const scored = products
    .filter((p) => p.stock > 0 && meta[p.id])
    .map((p) => {
      const m = meta[p.id];
      // Для лёгкого багажа каждые 200 г массы снижают оценку на единицу.
      const massPenalty = priority === "light" ? p.mass / 200 : 0;
      const score = m.fit[dest] * 2 + m.prio[priority] * 2 - massPenalty;
      return { p, m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.popularity - a.p.popularity || (a.p.id < b.p.id ? -1 : 1));

  let picked = scored.slice(0, kitSize(days, priority));
  // В любом наборе должно быть питание.
  if (!picked.some((x) => x.p.category === "food")) {
    const food = scored.find((x) => x.p.category === "food");
    if (food) picked = [...picked.slice(0, -1), food];
  }

  return picked.map(({ p, m }) => {
    const wanted = m.perDays ? Math.ceil(days / m.perDays) : 1;
    return { id: p.id, product: p, qty: Math.max(1, Math.min(wanted, p.stock)), why: m.why[dest] };
  });
}

// Итоги набора без исключённых позиций.
export function kitTotals(items, excluded = new Set()) {
  const active = items.filter((i) => !excluded.has(i.id));
  return {
    active,
    count: active.reduce((s, i) => s + i.qty, 0),
    positions: active.length,
    cost: active.reduce((s, i) => s + i.product.price * i.qty, 0),
    mass: active.reduce((s, i) => s + i.product.mass * i.qty, 0),
  };
}

export function describeExpedition({ dest, days, priority }) {
  const d = byId(DESTINATIONS, "id", dest);
  const t = byId(DURATIONS, "days", days);
  const p = byId(PRIORITIES, "id", priority);
  return { dest: d, duration: t, priority: p, title: `${d.name} · ${t.name} · ${p.name}`, text: `${d.lead} ${t.phrase} ${p.phrase}` };
}

// Номер паспорта: код направления, срок, приоритет и контрольное число состава.
export function passportNumber({ dest, days, priority }, items) {
  const d = byId(DESTINATIONS, "id", dest);
  const letter = { comfort: "К", research: "И", light: "Л" }[priority];
  const seed = items.map((i) => `${i.id}:${i.qty}`).join("|");
  let h = 7;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return `ОР-${d.code}-${days}${letter}-${String(h).padStart(4, "0")}`;
}
