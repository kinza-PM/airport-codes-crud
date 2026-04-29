import {
  InternalError,
  badRequest,
  logTrace,
  notFound,
  success,
} from "../helper/helper.js";
import { traceBase } from "../helper/traces.js";
import { getAirportCode } from "../services/airportCodeService.js";

export const handler = async (event) => {
  try {
    const { iataCode } = event?.pathParameters || {};
    if (!iataCode) {
      return badRequest("iataCode path parameter is required.");
    }

    const item = await getAirportCode(iataCode);
    if (!item) {
      return notFound(`Airport code for iataCode ${String(iataCode).trim().toUpperCase()} not found.`);
    }

    await logTrace({
      ...traceBase(event, "getAirportCode", { iataCode }),
      response: item,
    });

    console.log("response.data********", JSON.stringify(item, null, 2));
    return success(item);
  } catch (error) {
    console.log("error********", error);
    return InternalError(error);
  }
};
