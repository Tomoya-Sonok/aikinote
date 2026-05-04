import { QueryClient } from "@tanstack/react-query";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // staleTime: 同じデータをこの期間内に再要求してもキャッシュから即返す。
        // 30秒だと mutation 直後のページ遷移や戻る操作で頻繁に再フェッチされ、
        // ネイティブアプリの WebView 越しでは特に体感が遅くなる。2 分まで延長して
        // background refetch に任せる戦略にし、ユーザー操作直後の再描画を高速化する。
        staleTime: 2 * 60 * 1000,
        // gcTime: persistClient (PersistQueryClientProvider, maxAge 24h) で localStorage に
        // 永続化するため、in-memory の保持期間も長めに取り、タブ往復時の hydrate コストを下げる。
        gcTime: 30 * 60 * 1000,
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
