import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeText } from "./ng-word.js";

describe("normalizeText", () => {
  it("大文字を小文字に変換する", () => {
    // Act & Assert
    expect(normalizeText("HELLO")).toBe("hello");
  });

  it("全角英字を半角に変換する", () => {
    // Act & Assert: Ａ→a, Ｚ→z
    expect(normalizeText("Ａｂｃ")).toBe("abc");
  });

  it("全角数字を半角に変換する", () => {
    // Act & Assert: ０→0, ９→9
    expect(normalizeText("１２３")).toBe("123");
  });

  it("カタカナをひらがなに変換する", () => {
    // Act & Assert: ア→あ, カタカナ→かたかな
    expect(normalizeText("カタカナ")).toBe("かたかな");
  });

  it("半角・全角スペースを除去する", () => {
    // Act & Assert
    expect(normalizeText("hello world")).toBe("helloworld");
    expect(normalizeText("hello\u3000world")).toBe("helloworld");
  });

  it("区切り文字（ハイフン・アンダースコア・ピリオド等）を除去する", () => {
    // Act & Assert
    expect(normalizeText("a-b_c.d")).toBe("abcd");
  });

  it("ゼロ幅文字を除去する", () => {
    // Act & Assert: ゼロ幅スペース(U+200B)、ゼロ幅非結合(U+200C)、BOM(U+FEFF)
    expect(normalizeText("a\u200Bb\u200Cc\uFEFFd")).toBe("abcd");
  });

  it("複合的な正規化が正しく行われる（全角カタカナ+スペース+大文字→ひらがな小文字）", () => {
    // Arrange: "Ｔｅｓｔ テスト" → 全角→半角 + スペース除去 + カタカナ→ひらがな
    const input = "Ｔｅｓｔ テスト";

    // Act
    const result = normalizeText(input);

    // Assert
    expect(result).toBe("testてすと");
  });

  it("漢字はそのまま保持される（変換対象外）", () => {
    // Act & Assert: 漢字はひらがな/カタカナ変換の対象外
    expect(normalizeText("禁止")).toBe("禁止");
  });
});

describe("containsNgWord", () => {
  // containsNgWord はモジュールレベルのキャッシュを持つため、
  // テストごとにモジュールを再読み込みして独立性を保つ
  let containsNgWord: typeof import("./ng-word.js")["containsNgWord"];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("./ng-word.js");
    containsNgWord = mod.containsNgWord;
  });

  it("テキストにNGワードが含まれる場合はfound:trueを返す", async () => {
    // Arrange
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ word: "禁止" }],
          error: null,
        }),
      }),
    } as unknown as SupabaseClient;

    // Act
    const result = await containsNgWord(
      "この文に禁止ワードがある",
      mockSupabase,
    );

    // Assert
    expect(result.found).toBe(true);
  });

  it("テキストにNGワードが含まれない場合はfound:falseを返す", async () => {
    // Arrange
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ word: "禁止" }],
          error: null,
        }),
      }),
    } as unknown as SupabaseClient;

    // Act
    const result = await containsNgWord("安全なテキスト", mockSupabase);

    // Assert
    expect(result.found).toBe(false);
    expect(result.matchedWord).toBeUndefined();
  });

  it("全角英字で入力されたNGワードも正規化後に検出される", async () => {
    // Arrange: NGワード「badword」を登録
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ word: "badword" }],
          error: null,
        }),
      }),
    } as unknown as SupabaseClient;

    // Act: 全角英字「ＢＡＤＷＯＲＤ」で入力
    const result = await containsNgWord("ＢＡＤＷＯＲＤ", mockSupabase);

    // Assert: 正規化後にマッチ
    expect(result.found).toBe(true);
  });

  it("カタカナで回避を試みたNGワードも検出される", async () => {
    // Arrange: NGワード「てすと」（ひらがな）を登録
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ word: "てすと" }],
          error: null,
        }),
      }),
    } as unknown as SupabaseClient;

    // Act: カタカナ「テスト」で入力
    const result = await containsNgWord("テスト", mockSupabase);

    // Assert: カタカナ→ひらがな変換でマッチ
    expect(result.found).toBe(true);
  });
});
