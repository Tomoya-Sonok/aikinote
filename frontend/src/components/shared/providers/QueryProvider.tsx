"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { getQueryClient } from "@/lib/query/query-client";

let browserPersister: ReturnType<typeof createSyncStoragePersister> | undefined;

function getPersister() {
  if (typeof window === "undefined") return undefined;
  if (!browserPersister) {
    browserPersister = createSyncStoragePersister({
      storage: window.localStorage,
      throttleTime: 1000,
    });
  }
  return browserPersister;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const persister = getPersister();

  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.state.status === "success" && Boolean(query.state.data),
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
