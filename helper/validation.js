const normalizeCode = (value = "") => value.trim().toUpperCase();

const isIata = (value) => /^[A-Z]{3}$/.test(normalizeCode(value));

export const validateAirportCodePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return "Request payload must be a JSON object.";
  }

  const { iataCode, airportName, city, country, countryCode } = payload;

  if (!iataCode) {
    return "iataCode is required.";
  }

  if (!airportName) {
    return "airportName is required.";
  }

  if (!city) {
    return "city is required.";
  }

  if (!country) {
    return "country is required.";
  }

  if (!countryCode) {
    return "countryCode is required.";
  }

  if (!isIata(iataCode)) {
    return "iataCode must be 3 uppercase letters.";
  }

  if (typeof airportName !== "string") {
    return "airportName must be a string.";
  }

  if (typeof city !== "string") {
    return "city must be a string.";
  }

  if (typeof country !== "string") {
    return "country must be a string.";
  }

  if (typeof countryCode !== "string") {
    return "countryCode must be a string.";
  }

  return null;
};

export const validateListRequestPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return "Request payload must be an object.";
  }

  const filters = Array.isArray(payload.filters)
    ? payload.filters[0]?.searchFilterItems || []
    : [];

  const hasQueryAliases = payload.iataCode || payload.iata || payload.country || payload.city;

  const pagination = payload.pagination || payload;
  const rawItemsPerPage =
    pagination.itemsPerPage ?? pagination.limit ?? pagination.pageSize ?? 99;
  const rawPage = pagination.page ?? 1;

  if (Number.isNaN(Number(rawItemsPerPage)) || Number(rawItemsPerPage) <= 0) {
    return "pagination.itemsPerPage must be a positive number.";
  }

  if (Number.isNaN(Number(rawPage)) || Number(rawPage) <= 0) {
    return "pagination.page must be a positive number.";
  }

  return null;
};
