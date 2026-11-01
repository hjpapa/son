// localStorage can throw on school-managed tablets, in private browsing, or
// when storage is full. Fall back to memory so the game still runs.
const memory = new Map<string, string | null>();

export const safeStorage = {
  get(key: string): string | null {
    // A failed write can leave an older value readable in localStorage.
    // Keep the latest session value (including removals) authoritative.
    if (memory.has(key)) return memory.get(key)!;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
      memory.delete(key);
    } catch {
      memory.set(key, value);
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
      memory.delete(key);
    } catch {
      memory.set(key, null);
    }
  }
};
