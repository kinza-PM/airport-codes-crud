import {
  InternalError,
  badRequest,
  created,
  logTrace,
  parseRequestInput,
} from "../helper/helper.js";
import { traceBase } from "../helper/traces.js";
import { validateAirportCodePayload } from "../helper/validation.js";
import { createAirportCode } from "../services/airportCodeService.js";

export const handler = async (event) => {
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
