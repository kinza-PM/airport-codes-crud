import {
  InternalError,
  badRequest,
  logTrace,
  notFound,
  parseRequestInput,
  success,
} from "../helper/helper.js";
import { traceBase } from "../helper/traces.js";
import { updateAirportCode } from "../services/airportCodeService.js";

export const handler = async (event) => {
  try {
    const { country, city } = event?.pathParameters || {};
    const payload = parseRequestInput(event);
    const updatableFields = ["iataCode", "airportName", "countryCode"];
    if (!country || !city || !payload) {
      return badRequest("country and city path parameters and JSON body are required.");
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "country") ||
      Object.prototype.hasOwnProperty.call(payload, "city")
    ) {
      return badRequest("country and city are key fields and cannot be updated.");
    }

    const hasUpdatableField = updatableFields.some((field) =>
      Object.prototype.hasOwnProperty.call(payload, field),
    );

    if (!hasUpdatableField) {
      return badRequest(
        `At least one updatable field is required. Supported fields: ${updatableFields.join(", ")}.`,
      );
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
      return notFound(error.message || "Airport code not found.");
    }
    if (error?.statusCode === 400) {
      return badRequest(error.message);
    }
    return InternalError(error);
  }
};
