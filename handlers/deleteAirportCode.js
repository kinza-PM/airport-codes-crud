import {
  InternalError,
  badRequest,
  logTrace,
  notFound,
  success,
} from "../helper/helper.js";
import { traceBase } from "../helper/traces.js";
import { deleteAirportCode } from "../services/airportCodeService.js";

export const handler = async (event) => {
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
      return notFound(error.message || "Airport code not found.");
    }
    return InternalError(error);
  }
};
