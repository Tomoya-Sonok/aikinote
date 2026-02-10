import { createTRPCRouter } from "./index";
import { healthProcedure, honoBridgeTodoProcedure } from "./procedures";

export const appRouter = createTRPCRouter({
  health: healthProcedure,
  // TODO: Hono API 連携の手続きはここに追加していく
  honoBridgeTodo: honoBridgeTodoProcedure,
});

export type AppRouter = typeof appRouter;
