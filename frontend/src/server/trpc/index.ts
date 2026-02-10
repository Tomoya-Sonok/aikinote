import { initTRPC } from "@trpc/server";

export type TRPCContext = {
  req: Request;
};

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

// TODO: セッション情報を使う場合は、authenticatedProcedure を実装する
// import { TRPCError } from "@trpc/server";
// export const authenticatedProcedure = t.procedure.use(({ next, ctx }) => {
//   if (!ctx.session || !ctx.session.user) {
//     throw new TRPCError({
//       code: "UNAUTHORIZED",
//       message: "You must be logged in to access this resource",
//     });
//   }
//   return next();
// });
