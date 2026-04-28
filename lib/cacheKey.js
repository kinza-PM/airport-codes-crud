const stableSortObject = (value) => {
  if (Array.isArray(value)) {
    return value.map(stableSortObject);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = stableSortObject(value[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const stableStringify = (value) => JSON.stringify(stableSortObject(value));

export const buildAirportItemCacheKey = (country, city) =>
  `airport-codes:item:${String(country).trim().toLowerCase()}:${String(city).trim().toLowerCase()}`;

export const buildAirportListCacheKey = (payload) =>
  `airport-codes:list:${stableStringify(payload)}`;
