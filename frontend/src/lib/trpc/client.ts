import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/trpc/router";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }

  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
    }),
  ],
});
