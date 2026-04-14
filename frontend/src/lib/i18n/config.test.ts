import { describe, expect, it } from "vitest";
import { defaultLocale, locales } from "./config";

describe("i18n設定", () => {
  it("サポートされるロケールは日本語と英語のみ", () => {
    // Assert
    expect(locales).toEqual(["ja", "en"]);
  });

  it("デフォルトロケールは日本語", () => {
    // Assert
    expect(defaultLocale).toBe("ja");
  });
});
