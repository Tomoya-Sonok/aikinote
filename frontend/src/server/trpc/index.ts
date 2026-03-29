import { initTRPC, TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { getServerSupabase } from "@/lib/supabase/server";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export type TRPCContext = {
  req: Request;
};

type AuthenticatedContext = TRPCContext & {
  authToken: string;
};

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const authenticatedProcedure = t.procedure.use(async ({ next }) => {
  const serverSupabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await serverSupabase.auth.getUser();

  if (error || !user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "認証が必要です",
    });
  }

  const authToken = jwt.sign(
    {
      userId: user.id,
      email: user.email ?? "",
    },
    JWT_SECRET,
    {
      expiresIn: "24h",
    },
  );

  return next({
    ctx: { authToken } as AuthenticatedContext,
  });
});
