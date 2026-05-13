"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import dynamic from "next/dynamic";
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

// Devtools は本番バンドルから完全に消したいので next/dynamic + ssr:false で lazy import。
// process.env.NODE_ENV は Next のビルド時に静的置換されるため dead-code-elimination が効く。
const ReactQueryDevtools =
  process.env.NODE_ENV !== "production"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then(
            (mod) => mod.ReactQueryDevtools,
          ),
        { ssr: false },
      )
    : null;

// localStorage 永続化を併用しているため、Devtools の "Remove from cache" 操作は
// localStorage 側を直接書き換えない。乖離が気になる場合は手動で localStorage をクリアする。
function DevtoolsIfEnabled() {
  if (!ReactQueryDevtools) return null;
  return (
    <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
  );
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
          // 古い空キャッシュの残留で「まだ投稿がありません」等の誤表示が長引くのを避けるため 12h に短縮
          maxAge: 12 * 60 * 60 * 1000,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.state.status === "success" &&
              Boolean(query.state.data) &&
              // social-search は検索条件 × InfiniteData の page 蓄積で localStorage (5MB前後) を
              // 圧迫しうる。検索結果は揮発で十分なので persist 対象から除外する
              query.queryKey[0] !== "social-search",
          },
        }}
      >
        {children}
        <DevtoolsIfEnabled />
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <DevtoolsIfEnabled />
    </QueryClientProvider>
  );
}
