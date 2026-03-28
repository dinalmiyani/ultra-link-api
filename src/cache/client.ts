const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function connectRedis() {
  console.log("Cache: using in-memory store (no Redis required)");
}

export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key);

  if (cached && cached.expiresAt > now) {
    return JSON.parse(cached.value) as T;
  }

  const data = await fetcher();
  memoryCache.set(key, {
    value: JSON.stringify(data),
    expiresAt: now + ttlSeconds * 1000,
  });
  return data;
}

export async function invalidateCache(key: string) {
  memoryCache.delete(key);
}