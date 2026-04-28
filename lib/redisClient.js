const DEFAULT_TTL_SECONDS = Number.parseInt(process.env.CACHE_TTL_SECONDS || "60", 10);
const cacheEnabled = process.env.CACHE_ENABLED !== "false";
const cacheStore = globalThis.__airportCodesCacheStore || new Map();

globalThis.__airportCodesCacheStore = cacheStore;

const getExpiry = () => Date.now() + DEFAULT_TTL_SECONDS * 1000;

export const getCacheValue = async (key) => {
  if (!cacheEnabled) {
    return null;
  }

  const record = cacheStore.get(key);
  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return record.value;
};

export const setCacheValue = async (key, value) => {
  if (!cacheEnabled) {
    return value;
  }

  cacheStore.set(key, {
    value,
    expiresAt: getExpiry(),
  });

  return value;
};

export const deleteCacheValue = async (key) => {
  cacheStore.delete(key);
};

export const deleteCacheValuesByPrefix = async (prefix) => {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
};
