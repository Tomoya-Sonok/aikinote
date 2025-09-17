import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { beforeEach, describe, expect, it } from "vitest";

describe("ヘルスチェックAPI", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use(logger());
    app.use(
      cors({
        origin: ["http://localhost:3000", "http://frontend:3000"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
      }),
    );

    app.get("/health", (c) => {
      return c.json({
        status: "ok",
        message: "AikiNote API Server is running!",
        timestamp: new Date().toISOString(),
      });
    });
  });

  it("正常にヘルスチェックレスポンスを返すこと", async () => {
    const request = new Request("http://localhost/health", {
      method: "GET",
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.status).toBe("ok");
    expect(responseBody.message).toBe("AikiNote API Server is running!");
    expect(responseBody.timestamp).toBeDefined();
  });

  it("レスポンスボディのtimestampがISO文字列形式であること", async () => {
    const request = new Request("http://localhost/health", {
      method: "GET",
    });

    const response = await app.fetch(request);
    const responseBody = await response.json();

    expect(() => new Date(responseBody.timestamp)).not.toThrow();
    expect(responseBody.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("レスポンスボディが正しいJSON形式で返されること", async () => {
    const request = new Request("http://localhost/health", {
      method: "GET",
    });

    const response = await app.fetch(request);

    expect(response.status).toBe(200);
    expect(() => response.json()).not.toThrow();
  });
});
