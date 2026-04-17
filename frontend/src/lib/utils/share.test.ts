import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildShareUrl } from "./share";

describe("buildShareUrl", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Arrange: ブラウザ環境をシミュレート
    Object.defineProperty(globalThis, "window", {
      value: { location: { origin: "https://www.aikinote.com" } },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
    vi.unstubAllEnvs();
  });

  it("パスに openExternalBrowser=1 を付与したURLを返す", () => {
    // Act
    const result = buildShareUrl("/ja/social/posts/123");

    // Assert
    expect(result).toBe(
      "https://www.aikinote.com/ja/social/posts/123?openExternalBrowser=1",
    );
  });

  it("既存のクエリパラメータがある場合も正しく追加される", () => {
    // Act
    const result = buildShareUrl("/signup?ref=line");

    // Assert
    expect(result).toBe(
      "https://www.aikinote.com/signup?ref=line&openExternalBrowser=1",
    );
  });

  it("先頭にスラッシュがないパスでも正しく処理される", () => {
    // Act
    const result = buildShareUrl("ja/social/posts/456");

    // Assert
    expect(result).toBe(
      "https://www.aikinote.com/ja/social/posts/456?openExternalBrowser=1",
    );
  });

  it("SSR環境（window undefined）では NEXT_PUBLIC_APP_URL にフォールバックする", () => {
    // Arrange: window を undefined にし、環境変数を設定
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.aikinote.com");

    // Act
    const result = buildShareUrl("/ja/social/posts/789");

    // Assert
    expect(result).toBe(
      "https://staging.aikinote.com/ja/social/posts/789?openExternalBrowser=1",
    );
  });

  it("SSR環境で NEXT_PUBLIC_APP_URL も未設定の場合はデフォルトドメインにフォールバックする", () => {
    // Arrange
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    // Act
    const result = buildShareUrl("/signup");

    // Assert
    expect(result).toBe(
      "https://www.aikinote.com/signup?openExternalBrowser=1",
    );
  });
});
