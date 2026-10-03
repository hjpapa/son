// localStorage can throw on school-managed tablets, in private browsing, or
// when storage is full. Fall back to memory so the game still runs.
const memory = new Map<string, string>();

export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  remove(key: string): void {
    memory.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing else to clear.
    }
  }
};
