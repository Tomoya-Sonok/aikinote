import { TRPC_ERROR_CODE_KEY } from "@trpc/server";
import { AxiosError } from "axios";
import { StatusCodes } from "http-status-codes";

export function mapTRPCErrorCodeKeyFromStatusCode(
  statusCode: StatusCodes,
): TRPC_ERROR_CODE_KEY {
  switch (statusCode) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 429:
      return "TOO_MANY_REQUESTS";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

export function mapAxiosErrorToTRPCError(label: string, err: AxiosError) {
  return {
    code: mapTRPCErrorCodeKeyFromStatusCode(err.response?.status || 500),
    message: `${err.response?.statusText || "Internal Server Error"}: ${label}`,
    cause: err,
  };
}
