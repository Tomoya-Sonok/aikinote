import { QueryClient } from "@tanstack/react-query";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        // モバイルでの帯域・バッテリー消費を抑えるため、フォーカス時の自動 refetch はデフォルト OFF
        // 通知カウントなどフォーカス復帰時に追随させたいクエリは個別に `refetchOnWindowFocus: true` を指定する
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// Server: 毎リクエストで新規作成（ユーザー間のキャッシュ共有を防ぐ）
// Client: シングルトンで hydration 後も維持
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
