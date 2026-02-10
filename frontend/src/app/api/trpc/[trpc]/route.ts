import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";

// pages router の `pages/api/trpc/[trpc].ts` に相当する App Router 版ハンドラ
const createContext = (req: Request) => ({ req });

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError({ error, path }) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[tRPC] path=${path ?? "unknown"}`, error);
      }
    },
  });

export const GET = handler;
export const POST = handler;
