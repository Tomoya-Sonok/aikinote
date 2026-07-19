import { initTRPC, TRPCError } from "@trpc/server";
import { createBackendAuthToken } from "@/lib/server/auth";

export type TRPCContext = {
  req: Request;
  /**
   * リクエスト内で1回だけ認証検証とバックエンド用 JWT 発行を行う遅延メモ。
   * httpBatchLink により 1 HTTP リクエストへ複数手続きが同乗するため、
   * 手続きごとに Supabase への検証が重複しないようにする。
   */
  getAuthToken: () => Promise<string | null>;
};

type AuthenticatedContext = TRPCContext & {
  authToken: string;
};

export const createTRPCContext = (req: Request): TRPCContext => {
  let authTokenPromise: Promise<string | null> | undefined;
  return {
    req,
    getAuthToken: () => {
      authTokenPromise ??= createBackendAuthToken();
      return authTokenPromise;
    },
  };
};

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const authToken = await ctx.getAuthToken();

  if (!authToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "認証が必要です",
    });
  }

  return next({
    ctx: { ...ctx, authToken } satisfies AuthenticatedContext,
  });
});
