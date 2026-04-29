import {
  InternalError,
  badRequest,
  logTrace,
  parseRequestInput,
  success,
} from "../helper/helper.js";
import { traceBase } from "../helper/traces.js";
import { validateListRequestPayload } from "../helper/validation.js";
import { listAirportCodes } from "../services/airportCodeService.js";

export const handler = async (event) => {
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
