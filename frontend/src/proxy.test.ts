import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// next-intl middleware と Supabase クライアントをモック
vi.mock("next-intl/middleware", () => ({
  default: () => () =>
    NextResponse.next({ request: { headers: new Headers() } }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getSession: vi.fn().mockResolvedValue({}) },
  }),
}));

vi.mock("./lib/i18n/routing", () => ({
  routing: {},
}));

/**
 * テスト用の NextRequest を簡易的に作成するヘルパー
 */
function createMockRequest(
  url: string,
  options?: { userAgent?: string },
): NextRequest {
  const request = new Request(url, {
    headers: new Headers({
      "user-agent": options?.userAgent ?? "",
    }),
  }) as unknown as NextRequest;

  const parsedUrl = new URL(url);

  Object.defineProperty(request, "nextUrl", {
    value: {
      ...parsedUrl,
      clone: () => new URL(url),
      searchParams: parsedUrl.searchParams,
      pathname: parsedUrl.pathname,
    },
    writable: false,
  });

  Object.defineProperty(request, "cookies", {
    value: {
      get: () => undefined,
      getAll: () => [],
      set: vi.fn(),
    },
    writable: false,
  });

  return request;
}

describe("proxy: LINE内蔵ブラウザ対策", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("LINE UA + openExternalBrowser なしの場合、パラメータ付きURLへ302リダイレクトする", async () => {
    // Arrange
    const { proxy } = await import("./proxy");
    const request = createMockRequest("https://www.aikinote.com/ja/login", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Line/14.5.0",
    });

    // Act
    const response = await proxy(request);

    // Assert
    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toContain("openExternalBrowser=1");
    expect(location).toContain("/ja/login");
  });

  it("LINE UA + openExternalBrowser=1 が既にある場合、リダイレクトしない（無限ループ防止）", async () => {
    // Arrange
    const { proxy } = await import("./proxy");
    const request = createMockRequest(
      "https://www.aikinote.com/ja/login?openExternalBrowser=1",
      {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Line/14.5.0",
      },
    );

    // Act
    const response = await proxy(request);

    // Assert
    expect(response.status).not.toBe(302);
  });

  it("通常のChrome UAの場合、リダイレクトしない", async () => {
    // Arrange
    const { proxy } = await import("./proxy");
    const request = createMockRequest("https://www.aikinote.com/ja/login", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
    });

    // Act
    const response = await proxy(request);

    // Assert
    expect(response.status).not.toBe(302);
  });

  it("LINE UA + 既存クエリパラメータがある場合、保持した上で openExternalBrowser=1 を追加する", async () => {
    // Arrange
    const { proxy } = await import("./proxy");
    const request = createMockRequest(
      "https://www.aikinote.com/ja/signup?ref=line",
      {
        userAgent: "Mozilla/5.0 (Linux; Android 13) Line/14.5.0",
      },
    );

    // Act
    const response = await proxy(request);

    // Assert
    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toContain("ref=line");
    expect(location).toContain("openExternalBrowser=1");
  });
});
