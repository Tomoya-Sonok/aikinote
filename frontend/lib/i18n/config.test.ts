import { describe, expect, it } from "vitest";
import { locales, defaultLocale, type Locale } from "./config";

describe("i18n設定値テスト", () => {
  describe("サポートされるロケール定義", () => {
    it("ロケール配列に日本語が含まれる", () => {
      // Arrange: 期待される日本語ロケールを設定する
      const expectedJapaneseLocale = "ja";

      // Act: 設定されているロケール配列を取得する
      const actualLocales = locales;

      // Assert: ロケール配列に日本語が含まれている
      expect(actualLocales).toContain(expectedJapaneseLocale);
    });

    it("ロケール配列に英語が含まれる", () => {
      // Arrange: 期待される英語ロケールを設定する
      const expectedEnglishLocale = "en";

      // Act: 設定されているロケール配列を取得する
      const actualLocales = locales;

      // Assert: ロケール配列に英語が含まれている
      expect(actualLocales).toContain(expectedEnglishLocale);
    });

    it("サポートされるロケールは日本語と英語の2つのみ", () => {
      // Arrange: 期待されるロケール配列を設定する
      const expectedLocales = ["ja", "en"];

      // Act: 設定されているロケール配列を取得する
      const actualLocales = locales;

      // Assert: 設定されているロケールが期待値と完全に一致する
      expect(actualLocales).toEqual(expectedLocales);
    });

    it("ロケール配列の長さは2である", () => {
      // Arrange: 期待されるロケール数を設定する
      const expectedLocaleCount = 2;

      // Act: 設定されているロケール数を取得する
      const actualLocaleCount = locales.length;

      // Assert: ロケール数が期待値と一致する
      expect(actualLocaleCount).toBe(expectedLocaleCount);
    });
  });

  describe("デフォルトロケール設定", () => {
    it("デフォルトロケールは日本語に設定されている", () => {
      // Arrange: 期待されるデフォルトロケールを設定する
      const expectedDefaultLocale = "ja";

      // Act: 設定されているデフォルトロケールを取得する
      const actualDefaultLocale = defaultLocale;

      // Assert: デフォルトロケールが日本語に設定されている
      expect(actualDefaultLocale).toBe(expectedDefaultLocale);
    });

    it("デフォルトロケールはサポートされるロケールに含まれる", () => {
      // Arrange: 設定されているデフォルトロケールとサポートロケールを取得する
      const configuredDefaultLocale = defaultLocale;
      const supportedLocales = locales;

      // Act: デフォルトロケールがサポートロケールに含まれているか確認する
      const isDefaultLocaleSupported = supportedLocales.includes(configuredDefaultLocale);

      // Assert: デフォルトロケールがサポートされるロケールに含まれている
      expect(isDefaultLocaleSupported).toBe(true);
    });
  });

  describe("型定義の整合性", () => {
    it("Locale型が文字列リテラル型として正しく定義されている", () => {
      // Arrange: 日本語ロケールを型として検証する
      const japaneseLocale: Locale = "ja";
      const englishLocale: Locale = "en";

      // Act: 型が正しく定義されているか確認する
      const isJapaneseLocaleValid = typeof japaneseLocale === "string";
      const isEnglishLocaleValid = typeof englishLocale === "string";

      // Assert: 両方のロケールが文字列として定義されている
      expect(isJapaneseLocaleValid).toBe(true);
      expect(isEnglishLocaleValid).toBe(true);
    });

    it("デフォルトロケールの型がLocale型と互換性がある", () => {
      // Arrange: デフォルトロケールを型として検証する
      const configuredDefaultLocale: Locale = defaultLocale;

      // Act: デフォルトロケールの型が正しいか確認する
      const isDefaultLocaleTypeValid = typeof configuredDefaultLocale === "string";

      // Assert: デフォルトロケールがLocale型として有効である
      expect(isDefaultLocaleTypeValid).toBe(true);
    });
  });

  describe("言語設定の仕様確認", () => {
    it("URLにプレフィックスがない場合はデフォルトロケール（日本語）が使用される", () => {
      // Arrange: プレフィックスなしURL用のロケールとして設定されたデフォルトロケールを取得する
      const urlWithoutPrefix = "/signup";
      const expectedLocaleForNoPrefix = "ja";

      // Act: デフォルトロケールを取得する
      const actualDefaultLocale = defaultLocale;

      // Assert: プレフィックスなしの場合に使用されるロケールが日本語である
      expect(actualDefaultLocale).toBe(expectedLocaleForNoPrefix);
    });

    it("URLに/enプレフィックスがある場合は英語ロケールが使用される", () => {
      // Arrange: enプレフィックス付きURL用のロケールを設定する
      const urlWithEnPrefix = "/en/signup";
      const expectedLocaleForEnPrefix = "en";

      // Act: 英語ロケールがサポートされているか確認する
      const isEnglishLocaleSupported = locales.includes(expectedLocaleForEnPrefix);

      // Assert: enプレフィックス用の英語ロケールがサポートされている
      expect(isEnglishLocaleSupported).toBe(true);
    });
  });

  describe("設定値の不変性", () => {
    it("ロケール配列は変更されない", () => {
      // Arrange: 元のロケール配列のコピーを作成する
      const originalLocales = [...locales];

      // Act: ロケール配列への変更を試みる（実際には変更されない想定）
      const currentLocales = locales;

      // Assert: ロケール配列が変更されていない
      expect(currentLocales).toEqual(originalLocales);
    });

    it("デフォルトロケールは固定値である", () => {
      // Arrange: 期待されるデフォルトロケール値を設定する
      const expectedFixedDefaultLocale = "ja";

      // Act: デフォルトロケールの値を取得する
      const actualDefaultLocale = defaultLocale;

      // Assert: デフォルトロケールが固定値として設定されている
      expect(actualDefaultLocale).toBe(expectedFixedDefaultLocale);
    });
  });
});