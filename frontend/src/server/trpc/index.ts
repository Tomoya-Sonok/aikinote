import {
  // TRPCError,
  initTRPC,
} from "@trpc/server";

const t = initTRPC.create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// TODO: セッション情報を使う場合は、authenticatedProcedure を実装する
// export const authenticatedProcedure = t.procedure.use(({ next, ctx }) => {
//   if (!ctx.session || !ctx.session.user) {
//     throw new TRPCError({
//       code: "UNAUTHORIZED",
//       message: "You must be logged in to access this resource",
//     });
//   }
//   return next();
// });
