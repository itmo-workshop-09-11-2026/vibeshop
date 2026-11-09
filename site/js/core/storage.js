// Безопасная обёртка над localStorage. Если хранилище недоступно (приватный режим,
// запрет cookies, переполнение), данные живут в памяти до перезагрузки страницы.
export function createStorage(backend) {
  const memory = new Map();
  let usable = true;

  if (backend === undefined) {
    try { backend = globalThis.localStorage; } catch { backend = null; }
  }
  if (!backend) usable = false;

  return {
    get persistent() { return usable; },
    // -> { status: "ok" | "missing" | "corrupt", value }
    read(key) {
      let text = null;
      if (usable) {
        try { text = backend.getItem(key); } catch { usable = false; }
      }
      if (!usable) text = memory.get(key) ?? null;
      if (text === null || text === undefined) return { status: "missing", value: null };
      try { return { status: "ok", value: JSON.parse(text) }; } catch { return { status: "corrupt", value: null }; }
    },
    write(key, value) {
      const text = JSON.stringify(value);
      memory.set(key, text);
      if (!usable) return false;
      try { backend.setItem(key, text); return true; } catch { usable = false; return false; }
    },
    remove(key) {
      memory.delete(key);
      if (usable) { try { backend.removeItem(key); } catch { usable = false; } }
    },
  };
}
