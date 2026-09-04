import { randomUUID } from "node:crypto";
import type { EventFormValues, WorkItemResult } from "./work-items";

type RpcError = { code?: string };

const TEMPORARY_ERROR_CODES = new Set([
  "57P01",
  "57P02",
  "57P03",
  "58000",
  "PGRST000",
  "PGRST001",
  "PGRST002",
  "PGRST003",
]);

export function eventRpcErrorResult(error: RpcError, values: EventFormValues): WorkItemResult {
  if (error.code === "42501" || error.code === "PGRST301") {
    return {
      status: "error",
      message: "Your staff session has expired or is no longer authorized. Sign in again, then retry creating the event.",
      values,
    };
  }

  if (error.code === "22023") {
    return {
      status: "error",
      message: "The event details were rejected. Correct the title and event times, then submit the form again.",
      values,
    };
  }

  if (error.code?.startsWith("08") || error.code?.startsWith("53") || TEMPORARY_ERROR_CODES.has(error.code ?? "")) {
    return {
      status: "error",
      message: "The event service is temporarily unavailable. Wait a moment and retry; your event was not created.",
      values,
    };
  }

  const contextId = randomUUID();
  console.error("Unexpected create_crm_event RPC failure", {
    code: error.code ?? "unknown",
    contextId,
  });
  return {
    status: "error",
    message: `The event could not be created. Retry later. If the problem continues, share reference ${contextId} with support.`,
    values,
  };
}
