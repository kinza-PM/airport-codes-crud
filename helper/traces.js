import { randomUUID } from "node:crypto";

export const traceBase = (event, action, request) => ({
  id: randomUUID(),
  action,
  method: event?.httpMethod,
  path: event?.path,
  request,
  status: "active",
});
