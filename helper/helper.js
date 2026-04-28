import { buildAirportItemCacheKey, buildAirportListCacheKey } from "../lib/cacheKey.js";
import {
  deleteCacheValue,
  deleteCacheValuesByPrefix,
  getCacheValue,
  setCacheValue,
} from "../lib/redisClient.js";

export const globalHeaders = () => ({
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  },
});

export const jsonResponse = (statusCode, body) => ({
  statusCode,
  ...globalHeaders(),
  body: JSON.stringify(body),
});

export const badRequest = (message) => jsonResponse(400, { message });
export const notFound = (message) => jsonResponse(404, { message });
export const created = (body) => jsonResponse(201, body);
export const success = (body) => jsonResponse(200, body);

export const InternalError = async (error) => {
  console.error("InternalError", error);
  return jsonResponse(500, {
    message: error?.message || "Internal server error.",
  });
};

export const parseRequestInput = (event) => {
  if (!event?.body) {
    return null;
  }

  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (error) {
    console.log("error********", error);
    return null;
  }
};

export const logTrace = async (payload) => {
  if (process.env.TRACE_LOGGING_ENABLED === "false") {
    return;
  }

  console.log("trace", JSON.stringify(payload));
};

export const getCachedAirportItem = async (country, city) =>
  getCacheValue(buildAirportItemCacheKey(country, city));

export const setCachedAirportItem = async (country, city, value) =>
  setCacheValue(buildAirportItemCacheKey(country, city), value);

export const deleteCachedAirportItem = async (country, city) =>
  deleteCacheValue(buildAirportItemCacheKey(country, city));

export const getCachedAirportList = async (payload) =>
  getCacheValue(buildAirportListCacheKey(payload));

export const setCachedAirportList = async (payload, value) =>
  setCacheValue(buildAirportListCacheKey(payload), value);

export const invalidateAirportListCache = async () =>
  deleteCacheValuesByPrefix("airport-codes:list:");
