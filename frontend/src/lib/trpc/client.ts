import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/trpc/router";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }

  // TODO: 本番運用時にフロントエンドの公開URL環境変数へ置き換える
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
    }),
  ],
});

// TODO: 利用開始時は呼び出し箇所で `await trpcClient.health.query()` から接続確認する
