import { createAdaptorServer } from "@hono/node-server";
import app from "./app.js";

// Hono RPC のために型をエクスポート
export type AppType = typeof app;

const port = Number(process.env.PORT) || 8787;

const server = createAdaptorServer({
  fetch: (request) => app.fetch(request, process.env),
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `❌ ポート ${port} はすでに使用中です。既存の backend プロセスを停止してから再実行してください。`,
    );
    process.exit(1);
  }

  console.error("❌ バックエンドサーバーの起動に失敗しました。", error);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});

let shuttingDown = false;

const gracefulShutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`🛑 ${signal} を受信したため、サーバーを停止します。`);

  const forceExitTimer = setTimeout(() => {
    console.error("❌ サーバー停止がタイムアウトしました。強制終了します。");
    process.exit(1);
  }, 5_000);

  server.close((error) => {
    clearTimeout(forceExitTimer);
    if (error) {
      console.error("❌ サーバー停止中にエラーが発生しました。", error);
      process.exit(1);
    }
    console.log("✅ サーバーを停止しました。");
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
