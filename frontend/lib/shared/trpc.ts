import type { QueryClientConfig } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/lib/server/trpc/router/_app";

export const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
};

export const trpc = createTRPCReact<AppRouter>();
