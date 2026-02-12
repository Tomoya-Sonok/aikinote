import { createTRPCRouter } from "./index";
import {
  createPageProcedure,
  createTagProcedure,
  createUserProcedure,
  deletePageProcedure,
  deleteTagProcedure,
  getPageProcedure,
  getPagesProcedure,
  getTagsProcedure,
  getUserProfileProcedure,
  healthProcedure,
  honoBridgeTodoProcedure,
  initializeUserTagsProcedure,
  updatePageProcedure,
  updateTagOrderProcedure,
  updateUserProfileProcedure,
} from "./procedures";

export const appRouter = createTRPCRouter({
  health: healthProcedure,
  // TODO: Hono API 連携の手続きはここに追加していく
  honoBridgeTodo: honoBridgeTodoProcedure,
  pages: createTRPCRouter({
    getList: getPagesProcedure,
    getById: getPageProcedure,
    create: createPageProcedure,
    update: updatePageProcedure,
    remove: deletePageProcedure,
  }),
  tags: createTRPCRouter({
    getList: getTagsProcedure,
    create: createTagProcedure,
    remove: deleteTagProcedure,
    updateOrder: updateTagOrderProcedure,
    initializeForUser: initializeUserTagsProcedure,
  }),
  users: createTRPCRouter({
    getProfile: getUserProfileProcedure,
    updateProfile: updateUserProfileProcedure,
    create: createUserProcedure,
  }),
});

export type AppRouter = typeof appRouter;
