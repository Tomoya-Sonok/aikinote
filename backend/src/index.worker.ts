import app from "./app.js";
import { processReminders } from "./lib/reminder.js";

interface CfScheduledEvent {
  cron: string;
  type: "scheduled";
  scheduledTime: number;
}

interface CfExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export default {
  fetch: app.fetch,
  scheduled: async (
    _event: CfScheduledEvent,
    env: Record<string, string>,
    ctx: CfExecutionContext,
  ) => {
    ctx.waitUntil(processReminders(env));
  },
};
