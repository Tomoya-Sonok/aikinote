import { TRPCError } from "@trpc/server";
import axiox from "axios";
import { mapAxiosErrorToTRPCError } from "../../../server/trpc/error";

export async function fetchTRPCData<T>(
  label: string,
  fetcher: () => Promise<T>,
) {
  return fetcher().catch((err: unknown) => {
    if (axiox.isAxiosError(err)) {
      throw new TRPCError(mapAxiosErrorToTRPCError(label, err));
    }
    throw err;
  });
}
