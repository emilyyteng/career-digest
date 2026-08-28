type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/** Read cached list data for instant remount (session lifetime, no TTL). */
export function readListCache<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  return entry?.data ?? null;
}

export function writeListCache<T>(key: string, data: T): void {
  store.set(key, { data, fetchedAt: Date.now() });
}

/** Drop cached lists when a mutation may have changed multiple views. */
export function invalidateListCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
