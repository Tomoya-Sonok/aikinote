import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter } from "@/lib/server/trpc/router/_app";

export default createNextApiHandler({
  router: appRouter,
  batching: { enabled: true },
});
