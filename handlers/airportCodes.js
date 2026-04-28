import { randomUUID } from "node:crypto";
import {
  InternalError,
  badRequest,
  created,
  logTrace,
  notFound,
  parseRequestInput,
  success,
} from "../helper/helper.js";
import {
  validateAirportCodePayload,
  validateListRequestPayload,
} from "../helper/validation.js";
import {
  createAirportCode,
  deleteAirportCode,
  getAirportCode,
  listAirportCodes,
  updateAirportCode,
} from "../services/airportCodeService.js";

const traceBase = (event, action, request) => ({
  id: randomUUID(),
  action,
  method: event?.httpMethod,
  path: event?.path,
  request,
  status: "active",
});

export const createAirportCodeHandler = async (event) => {
  try {
    const payload = parseRequestInput(event);
    const validationError = validateAirportCodePayload(payload);
    if (validationError) {
      return badRequest(validationError);
    }

    const item = await createAirportCode(payload);
    await logTrace({
      ...traceBase(event, "createAirportCode", payload),
      response: item,
    });

    console.log("response.data********", JSON.stringify(item, null, 2));
    return created(item);
  } catch (error) {
    console.log("error********", error);
    return InternalError(error);
  }
};

export const listAirportCodesHandler = async (event) => {
  try {
    const body = parseRequestInput(event) || {};
    const query = event?.queryStringParameters || {};
    const payload = { ...query, ...body };
    const validationError = validateListRequestPayload(payload);
    if (validationError) {
      return badRequest(validationError);
    }

    const response = await listAirportCodes(payload);
    await logTrace({
      ...traceBase(event, "listAirportCodes", payload),
      response,
    });

    console.log("response.data********", JSON.stringify(response, null, 2));
    return success(response);
  } catch (error) {
    console.log("error********", error);
    if (error?.statusCode === 400) {
      return badRequest(error.message);
    }
    return InternalError(error);
  }
};

export const getAirportCodeHandler = async (event) => {
  try {
    const { country, city } = event?.pathParameters || {};
    if (!country || !city) {
      return badRequest("country and city path parameters are required.");
    }

    const item = await getAirportCode(country, city);
    if (!item) {
      return notFound(`Airport code for ${country}/${city} not found.`);
    }

    await logTrace({
      ...traceBase(event, "getAirportCode", { country, city }),
      response: item,
    });

    console.log("response.data********", JSON.stringify(item, null, 2));
    return success(item);
  } catch (error) {
    console.log("error********", error);
    return InternalError(error);
  }
};

export const updateAirportCodeHandler = async (event) => {
  try {
    const { country, city } = event?.pathParameters || {};
    const payload = parseRequestInput(event);
    if (!country || !city || !payload) {
      return badRequest("country and city path parameters and JSON body are required.");
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "country") ||
      Object.prototype.hasOwnProperty.call(payload, "city")
    ) {
      return badRequest("country and city are key fields and cannot be updated.");
    }

    const item = await updateAirportCode(country, city, payload);
    await logTrace({
      ...traceBase(event, "updateAirportCode", { country, city, payload }),
      response: item,
    });

    console.log("response.data********", JSON.stringify(item, null, 2));
    return success(item);
  } catch (error) {
    console.log("error********", error);
    if (error?.code === "ConditionalCheckFailedException") {
      const { country, city } = event?.pathParameters || {};
      return notFound(`Airport code for ${country}/${city} not found.`);
    }
    if (error?.statusCode === 400) {
      return badRequest(error.message);
    }
    return InternalError(error);
  }
};

export const deleteAirportCodeHandler = async (event) => {
  try {
    const { country, city } = event?.pathParameters || {};
    if (!country || !city) {
      return badRequest("country and city path parameters are required.");
    }

    await deleteAirportCode(country, city);
    const response = { message: `Airport code for ${country}/${city} deleted.` };

    await logTrace({
      ...traceBase(event, "deleteAirportCode", { country, city }),
      response,
    });

    console.log("response.data********", JSON.stringify(response, null, 2));
    return success(response);
  } catch (error) {
    console.log("error********", error);
    if (error?.code === "ConditionalCheckFailedException") {
      const { country, city } = event?.pathParameters || {};
      return notFound(`Airport code for ${country}/${city} not found.`);
    }
    return InternalError(error);
  }
};

export const handler = listAirportCodesHandler;

export {
  createAirportCodeHandler as createAirportCode,
  listAirportCodesHandler as listAirportCodes,
  getAirportCodeHandler as getAirportCode,
  updateAirportCodeHandler as updateAirportCode,
  deleteAirportCodeHandler as deleteAirportCode,
};
