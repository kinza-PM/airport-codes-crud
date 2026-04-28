import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  deleteCachedAirportItem,
  getCachedAirportItem,
  getCachedAirportList,
  invalidateAirportListCache,
  setCachedAirportItem,
  setCachedAirportList,
} from "../helper/helper.js";
import { dynamoDb } from "../lib/dynamoClient.js";

const tableName = process.env.AIRPORT_TABLE;
const DEFAULT_ITEMS_PER_PAGE = 99;

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const toUpper = (value) => normalizeString(value).toUpperCase();
const toLower = (value) => normalizeString(value).toLowerCase();

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const createBadRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const buildPagination = (pagination = {}) => ({
  itemsPerPage: toPositiveInteger(
    pagination.itemsPerPage,
    DEFAULT_ITEMS_PER_PAGE,
  ),
  page: toPositiveInteger(pagination.page, 1),
  nextToken: normalizeString(pagination.nextToken),
});

const buildFiltersFromSource = (source = {}) => {
  if (Array.isArray(source.filters) && source.filters.length > 0) {
    return source.filters;
  }

  const filters = [{ searchFilterItems: [] }];
  const searchFilterItems = filters[0].searchFilterItems;
  const iataCode = source.iataCode;

  if (iataCode) {
    searchFilterItems.push({ type: "iataCode", value: toUpper(iataCode) });
  }

  if (source.country) {
    searchFilterItems.push({ type: "country", value: normalizeString(source.country) });
  }

  if (source.city) {
    searchFilterItems.push({ type: "city", value: normalizeString(source.city) });
  }

  return filters;
};

const buildSearchPayload = (source = {}) => {
  const pagination = buildPagination(source.pagination || source);
  const filters = buildFiltersFromSource(source);
  const order = normalizeString(source.order || "DEFAULT").toUpperCase() || "DEFAULT";

  if (!["DEFAULT", "ASC", "DESC"].includes(order)) {
    throw createBadRequestError("Bad Request: 'order' should be either 'DEFAULT', 'ASC', or 'DESC' only.");
  }

  return {
    filters,
    pagination,
    order,
  };
};

const getSearchFilterItems = (searchPayload) => searchPayload.filters[0]?.searchFilterItems || [];
const getFilterValue = (searchFilterItems, type) =>
  searchFilterItems.find((item) => item.type === type)?.value;

const validateSupportedFilters = (searchFilterItems) => {
  const supportedTypes = new Set(["iataCode", "country", "city"]);
  const unsupportedFilter = searchFilterItems.find((item) => !supportedTypes.has(item.type));

  if (unsupportedFilter) {
    throw createBadRequestError(
      `Unsupported filter type "${unsupportedFilter.type}". Supported filters are iataCode, country, and city.`,
    );
  }
};

const decodePageToken = (pageToken) => {
  if (!pageToken) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.from(pageToken, "base64url").toString("utf8"));
  } catch (error) {
    console.log("error********", error);
    throw createBadRequestError("Invalid pageToken.");
  }
};

const encodePageToken = (lastEvaluatedKey) => {
  if (!lastEvaluatedKey) {
    return null;
  }

  return Buffer.from(JSON.stringify(lastEvaluatedKey), "utf8").toString("base64url");
};

const buildPaginationResponse = (pagination, lastEvaluatedKey) => ({
  itemsPerPage: pagination.itemsPerPage,
  nextToken: encodePageToken(lastEvaluatedKey),
  hasMore: Boolean(lastEvaluatedKey),
});

const runPagedQuery = async (queryInput, pagination) => {
  const result = await dynamoDb.send(
    new QueryCommand({
      ...queryInput,
      Limit: pagination.itemsPerPage,
      ExclusiveStartKey: decodePageToken(pagination.nextToken),
    }),
  );

  return {
    items: (result.Items || []).map((item) => unmarshall(item)),
    pagination: buildPaginationResponse(pagination, result.LastEvaluatedKey),
  };
};

const runPagedScan = async (pagination) => {
  const result = await dynamoDb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: pagination.itemsPerPage,
      ExclusiveStartKey: decodePageToken(pagination.nextToken),
    }),
  );

  return {
    items: (result.Items || []).map((item) => unmarshall(item)),
    pagination: buildPaginationResponse(pagination, result.LastEvaluatedKey),
  };
};

const buildAirportItem = (airport) => {
  const iataCode = toUpper(airport.iataCode);
  const airportName = normalizeString(airport.airportName);
  const city = normalizeString(airport.city);
  const country = normalizeString(airport.country);
  const countryCode = normalizeString(airport.countryCode);
  const now = new Date().toISOString();

  return {
    iataCode,
    airportName,
    city,
    country,
    countryCode,
    lowerAirportName: toLower(airportName),
    lowerCity: toLower(city),
    lowerCountry: toLower(country),
    updatedAt: now,
    createdAt: now,
  };
};

export const createAirportCode = async (airport) => {
  const item = buildAirportItem(airport);

  await dynamoDb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
      ConditionExpression: "attribute_not_exists(#country) AND attribute_not_exists(#city)",
      ExpressionAttributeNames: {
        "#country": "country",
        "#city": "city",
      },
    }),
  );

  await invalidateAirportListCache();
  await setCachedAirportItem(item.country, item.city, item);

  return item;
};

export const listAirportCodes = async (source = {}) => {
  const searchPayload = buildSearchPayload(source);
  const cachedList = await getCachedAirportList(searchPayload);

  if (cachedList) {
    return cachedList;
  }

  const searchFilterItems = getSearchFilterItems(searchPayload);
  const hasNoFilters = searchFilterItems.length === 0;

  if (!hasNoFilters) {
    validateSupportedFilters(searchFilterItems);
  }

  if (searchPayload.pagination.page > 1 && !searchPayload.pagination.nextToken) {
    throw createBadRequestError("Use nextToken for pagination beyond the first page.");
  }

  const hasOnlyIataFilter =
    searchFilterItems.length > 0 &&
    searchFilterItems.every((item) => item.type === "iataCode");
  const hasCountryFilter = searchFilterItems.some((item) => item.type === "country");
  const hasCityFilter = searchFilterItems.some((item) => item.type === "city");
  const hasOnlyCountryCityFilters =
    searchFilterItems.length > 0 &&
    searchFilterItems.every((item) => ["country", "city"].includes(item.type));

  let result;

  if (hasNoFilters) {
    result = await runPagedScan(searchPayload.pagination);
  } else if (hasOnlyIataFilter) {
    result = await runPagedQuery(
      {
        TableName: tableName,
        IndexName: "GSI_IATA_CODE",
        KeyConditionExpression: "iataCode = :iataCode",
        ExpressionAttributeValues: marshall({
          ":iataCode": toUpper(getFilterValue(searchFilterItems, "iataCode")),
        }),
      },
      searchPayload.pagination,
    );
  } else if (hasCountryFilter && hasOnlyCountryCityFilters) {
    const expressionAttributeValues = {
      ":lowerCountry": toLower(getFilterValue(searchFilterItems, "country")),
    };
    let keyConditionExpression = "lowerCountry = :lowerCountry";

    if (hasCityFilter) {
      expressionAttributeValues[":lowerCity"] = toLower(getFilterValue(searchFilterItems, "city"));
      keyConditionExpression += " AND lowerCity = :lowerCity";
    }

    result = await runPagedQuery(
      {
        TableName: tableName,
        IndexName: "GSI_LowerCountry_LowerCity",
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ScanIndexForward: searchPayload.order !== "DESC",
      },
      searchPayload.pagination,
    );
  } else {
    throw createBadRequestError(
      "Filtered requests only support index-backed queries: use iataCode, country, or country with city.",
    );
  }

  const response = {
    items: result.items,
    pagination: result.pagination,
    filters: searchPayload.filters,
    order: searchPayload.order,
  };

  await setCachedAirportList(searchPayload, response);

  return response;
};

export const getAirportCode = async (country, city) => {
  const cachedItem = await getCachedAirportItem(country, city);
  if (cachedItem) {
    return cachedItem;
  }

  const result = await dynamoDb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({
        country: normalizeString(country),
        city: normalizeString(city),
      }),
    }),
  );

  const item = result.Item ? unmarshall(result.Item) : undefined;

  if (item) {
    await setCachedAirportItem(country, city, item);
  }

  return item;
};

export const updateAirportCode = async (country, city, updates) => {
  const expression = [];
  const attributeNames = {};
  const attributeValues = {};
  const fields = {
    iataCode: "iataCode",
    airportName: "airportName",
    countryCode: "countryCode",
  };

  Object.entries(fields).forEach(([payloadKey, fieldName]) => {
    if (!Object.prototype.hasOwnProperty.call(updates, payloadKey)) {
      return;
    }

    const value = updates[payloadKey];
    const normalizedValue =
      fieldName === "iataCode"
        ? toUpper(value)
        : normalizeString(value);

    expression.push(`#${fieldName} = :${fieldName}`);
    attributeNames[`#${fieldName}`] = fieldName;
    attributeValues[`:${fieldName}`] = normalizedValue;

    if (fieldName === "airportName") {
      expression.push("#lowerAirportName = :lowerAirportName");
      attributeNames["#lowerAirportName"] = "lowerAirportName";
      attributeValues[":lowerAirportName"] = toLower(normalizedValue);
    }
  });

  if (expression.length === 0) {
    throw createBadRequestError("No fields provided for update.");
  }

  attributeNames["#updatedAt"] = "updatedAt";
  attributeValues[":updatedAt"] = new Date().toISOString();
  expression.push("#updatedAt = :updatedAt");

  const result = await dynamoDb.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: marshall({
        country: normalizeString(country),
        city: normalizeString(city),
      }),
      UpdateExpression: `SET ${expression.join(", ")}`,
      ExpressionAttributeNames: {
        ...attributeNames,
        "#country": "country",
        "#city": "city",
      },
      ExpressionAttributeValues: marshall(attributeValues),
      ConditionExpression: "attribute_exists(#country) AND attribute_exists(#city)",
      ReturnValues: "ALL_NEW",
    }),
  );

  const item = result.Attributes ? unmarshall(result.Attributes) : undefined;
  await deleteCachedAirportItem(country, city);
  await invalidateAirportListCache();

  if (item) {
    await setCachedAirportItem(item.country, item.city, item);
  }

  return item;
};

export const deleteAirportCode = async (country, city) => {
  await dynamoDb.send(
    new DeleteItemCommand({
      TableName: tableName,
      Key: marshall({
        country: normalizeString(country),
        city: normalizeString(city),
      }),
      ConditionExpression: "attribute_exists(#country) AND attribute_exists(#city)",
      ExpressionAttributeNames: {
        "#country": "country",
        "#city": "city",
      },
    }),
  );

  await deleteCachedAirportItem(country, city);
  await invalidateAirportListCache();
};
