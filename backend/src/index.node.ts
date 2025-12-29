import { serve } from "@hono/node-server";
import app from "./app.js";

// Hono RPC のために型をエクスポート
export type AppType = typeof app;

const port = Number(process.env.PORT) || 8787;
console.log(`🚀 Server is running on http://localhost:${port}`);

serve({
  fetch: (request) => app.fetch(request, process.env),
  port,
});
