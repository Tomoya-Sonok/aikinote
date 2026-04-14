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
        origin: ["http://localhost:3000", "https://aikinote.com"],
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

  it("GET /health にリクエストすると200・status:ok・ISO 8601形式のtimestampを返す", async () => {
    // Arrange
    const request = new Request("http://localhost/health", { method: "GET" });

    // Act
    const response = await app.fetch(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.message).toBe("AikiNote API Server is running!");
    expect(body.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});
