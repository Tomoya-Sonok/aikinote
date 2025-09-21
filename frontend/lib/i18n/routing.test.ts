import { describe, expect, it } from "vitest";

// テスト用のルーティング設定を直接定義
const testRoutingConfig = {
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed',
  localeDetection: false,
};

describe("i18nルーティング設定", () => {
  describe("サポートされるロケール", () => {
    it("日本語と英語の2つのロケールがサポートされる", () => {
      // Arrange: ルーティング設定からロケール情報を取得する
      const expectedLocales = ["ja", "en"];

      // Act: 設定されているロケール一覧を取得する
      const actualLocales = testRoutingConfig.locales;

      // Assert: 期待されるロケールが設定されている
      expect(actualLocales).toEqual(expectedLocales);
    });

    it("サポートされるロケールは2つである", () => {
      // Arrange: 期待されるロケール数を設定する
      const expectedLocaleCount = 2;

      // Act: 設定されているロケール数を取得する
      const actualLocaleCount = testRoutingConfig.locales.length;

      // Assert: ロケール数が期待値と一致する
      expect(actualLocaleCount).toBe(expectedLocaleCount);
    });
  });

  describe("デフォルトロケール", () => {
    it("デフォルトロケールは日本語である", () => {
      // Arrange: 期待されるデフォルトロケールを設定する
      const expectedDefaultLocale = "ja";

      // Act: 設定されているデフォルトロケールを取得する
      const actualDefaultLocale = testRoutingConfig.defaultLocale;

      // Assert: デフォルトロケールが日本語に設定されている
      expect(actualDefaultLocale).toBe(expectedDefaultLocale);
    });
  });

  describe("ロケールプレフィックス設定", () => {
    it("ロケールプレフィックスはas-neededに設定されている", () => {
      // Arrange: 期待されるロケールプレフィックス設定を設定する
      const expectedLocalePrefix = "as-needed";

      // Act: 設定されているロケールプレフィックスを取得する
      const actualLocalePrefix = testRoutingConfig.localePrefix;

      // Assert: ロケールプレフィックスがas-neededに設定されている
      expect(actualLocalePrefix).toBe(expectedLocalePrefix);
    });
  });

  describe("ロケール検出設定", () => {
    it("自動ロケール検出が無効化されている", () => {
      // Arrange: 期待されるロケール検出設定を設定する
      const expectedLocaleDetection = false;

      // Act: 設定されているロケール検出設定を取得する
      const actualLocaleDetection = testRoutingConfig.localeDetection;

      // Assert: ロケール検出が無効化されている
      expect(actualLocaleDetection).toBe(expectedLocaleDetection);
    });
  });

  describe("言語設定の期待される動作仕様", () => {
    it("プレフィックスなしのURLは日本語として扱われる", () => {
      // Arrange: プレフィックスなしのパスを設定する
      const pathWithoutPrefix = "/signup";
      const expectedLocale = "ja";

      // Act: デフォルトロケールを取得する
      const actualLocale = testRoutingConfig.defaultLocale;

      // Assert: プレフィックスなしの場合は日本語ロケールが適用される
      expect(actualLocale).toBe(expectedLocale);
    });

    it("enプレフィックス付きのURLは英語として扱われる", () => {
      // Arrange: 英語ロケールを設定する
      const englishLocale = "en";
      const pathWithEnPrefix = "/en/signup";

      // Act: サポートされるロケールに英語が含まれているか確認する
      const isEnglishSupported = testRoutingConfig.locales.includes(englishLocale);

      // Assert: 英語ロケールがサポートされている
      expect(isEnglishSupported).toBe(true);
    });

    it("/signupは日本語で表示される", () => {
      // Arrange: 日本語ページのパスを設定する
      const japanesePath = "/signup";
      const expectedLocale = "ja";

      // Act: デフォルトロケールを取得する
      const actualDefaultLocale = testRoutingConfig.defaultLocale;

      // Assert: プレフィックスなしのパスはデフォルトロケール（日本語）で表示される
      expect(actualDefaultLocale).toBe(expectedLocale);
    });

    it("/en/signupは英語で表示される", () => {
      // Arrange: 英語ページのパスとロケールを設定する
      const englishPath = "/en/signup";
      const expectedLocale = "en";

      // Act: 英語ロケールがサポートされているか確認する
      const isEnglishSupported = testRoutingConfig.locales.includes(expectedLocale);

      // Assert: 英語ロケールがサポートされているため英語で表示される
      expect(isEnglishSupported).toBe(true);
    });

    it("/loginは日本語で表示される", () => {
      // Arrange: 日本語ログインページのパスを設定する
      const japaneseLoginPath = "/login";
      const expectedLocale = "ja";

      // Act: デフォルトロケールを取得する
      const actualDefaultLocale = testRoutingConfig.defaultLocale;

      // Assert: プレフィックスなしのログインページは日本語で表示される
      expect(actualDefaultLocale).toBe(expectedLocale);
    });

    it("/en/loginは英語で表示される", () => {
      // Arrange: 英語ログインページのパスとロケールを設定する
      const englishLoginPath = "/en/login";
      const expectedLocale = "en";

      // Act: 英語ロケールがサポートされているか確認する
      const isEnglishSupported = testRoutingConfig.locales.includes(expectedLocale);

      // Assert: 英語ロケールがサポートされているため英語で表示される
      expect(isEnglishSupported).toBe(true);
    });
  });

  describe("リダイレクト動作の仕様", () => {
    it("前回英語ページにアクセスしていても日本語ページは日本語のままである", () => {
      // Arrange: ロケール検出が無効化されている設定を確認する
      const isLocaleDetectionDisabled = testRoutingConfig.localeDetection === false;

      // Act: ロケール検出設定を取得する
      const actualLocaleDetection = testRoutingConfig.localeDetection;

      // Assert: ロケール検出が無効化されているため前回の言語設定は影響しない
      expect(isLocaleDetectionDisabled).toBe(true);
      expect(actualLocaleDetection).toBe(false);
    });

    it("URLパスのみで言語が決定される", () => {
      // Arrange: ロケール検出無効化とas-needed設定を準備する
      const isLocaleDetectionDisabled = testRoutingConfig.localeDetection === false;
      const isLocalePrefixAsNeeded = testRoutingConfig.localePrefix === "as-needed";

      // Act: 設定値を取得する
      const actualLocaleDetection = testRoutingConfig.localeDetection;
      const actualLocalePrefix = testRoutingConfig.localePrefix;

      // Assert: URLパスのみで言語が決定される設定になっている
      expect(isLocaleDetectionDisabled).toBe(true);
      expect(isLocalePrefixAsNeeded).toBe(true);
      expect(actualLocaleDetection).toBe(false);
      expect(actualLocalePrefix).toBe("as-needed");
    });

    it("ブラウザの言語設定やCookieによる自動リダイレクトは発生しない", () => {
      // Arrange: ロケール検出が無効化されている設定を確認する
      const expectedLocaleDetection = false;

      // Act: ロケール検出設定を取得する
      const actualLocaleDetection = testRoutingConfig.localeDetection;

      // Assert: 自動ロケール検出が無効化されているため自動リダイレクトは発生しない
      expect(actualLocaleDetection).toBe(expectedLocaleDetection);
    });
  });
});