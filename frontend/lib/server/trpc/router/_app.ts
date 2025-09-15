import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { router } from "@/server/trpc";
import { trainingTagsRouter } from "./trainingTags";

export const appRouter = router({
  trainingTags: trainingTagsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
