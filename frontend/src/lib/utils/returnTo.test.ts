import { describe, expect, it } from "vitest";
import { isValidReturnTo } from "./returnTo";

describe("isValidReturnTo（オープンリダイレクト防止）", () => {
  it("通常の相対パスは有効", () => {
    // Act & Assert
    expect(isValidReturnTo("/personal/pages")).toBe(true);
  });

  it("クエリパラメータ付きパスは有効", () => {
    // Act & Assert
    expect(isValidReturnTo("/social/posts?tab=all")).toBe(true);
  });

  it("空文字は無効", () => {
    // Act & Assert
    expect(isValidReturnTo("")).toBe(false);
  });

  it("/で始まらないパスは無効（相対パスのみ許可）", () => {
    // Act & Assert
    expect(isValidReturnTo("personal/pages")).toBe(false);
  });

  it("//で始まるパスは無効（プロトコル相対URLを防止）", () => {
    // Act & Assert: //evil.com にリダイレクトされることを防止
    expect(isValidReturnTo("//evil.com/attack")).toBe(false);
  });

  it("://を含むパスは無効（絶対URLを防止）", () => {
    // Act & Assert
    expect(isValidReturnTo("https://evil.com")).toBe(false);
  });

  it("制御文字を含むパスは無効", () => {
    // Act & Assert: NULL文字（U+0000）
    expect(isValidReturnTo("/path\x00attack")).toBe(false);
  });

  it("バックスラッシュを含むパスは無効", () => {
    // Act & Assert: \\evil.com にリダイレクトされることを防止
    expect(isValidReturnTo("/path\\evil.com")).toBe(false);
  });

  it("2048文字を超えるパスは無効", () => {
    // Act & Assert
    expect(isValidReturnTo("/" + "a".repeat(2048))).toBe(false);
  });

  it("2048文字ちょうどのパスは有効（境界値）", () => {
    // Act & Assert
    expect(isValidReturnTo("/" + "a".repeat(2047))).toBe(true);
  });
});
