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
  getTrainingDatesMonthProcedure,
  getUserProfileProcedure,
  healthProcedure,
  honoBridgeTodoProcedure,
  initializeUserTagsProcedure,
  removeTrainingDateAttendanceProcedure,
  updatePageProcedure,
  updateTagOrderProcedure,
  updateUserProfileProcedure,
  upsertTrainingDateAttendanceProcedure,
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
  trainingDates: createTRPCRouter({
    getMonth: getTrainingDatesMonthProcedure,
    upsertAttendance: upsertTrainingDateAttendanceProcedure,
    removeAttendance: removeTrainingDateAttendanceProcedure,
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
