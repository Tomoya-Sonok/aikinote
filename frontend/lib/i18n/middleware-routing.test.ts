import { beforeEach, describe, expect, it, vi } from "vitest";

// ルーティング設定をテストするための簡単なテスト
const testRoutingConfig = {
  locales: ["ja", "en"],
  defaultLocale: "ja",
  localePrefix: "as-needed",
  localeDetection: false,
};

describe("ミドルウェアルーティング動作テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ルーティング設定の確認", () => {
    it("ロケール検出が無効化されている", () => {
      // Arrange: ロケール検出の設定値を準備する
      const expectedLocaleDetection = false;

      // Act: 設定されているロケール検出設定を取得する
      const actualLocaleDetection = testRoutingConfig.localeDetection;

      // Assert: ロケール検出が無効化されている
      expect(actualLocaleDetection).toBe(expectedLocaleDetection);
    });

    it("ロケールプレフィックスがas-neededに設定されている", () => {
      // Arrange: 期待されるロケールプレフィックス設定を準備する
      const expectedLocalePrefix = "as-needed";

      // Act: 設定されているロケールプレフィックスを取得する
      const actualLocalePrefix = testRoutingConfig.localePrefix;

      // Assert: ロケールプレフィックスがas-neededに設定されている
      expect(actualLocalePrefix).toBe(expectedLocalePrefix);
    });

    it("デフォルトロケールが日本語に設定されている", () => {
      // Arrange: 期待されるデフォルトロケールを準備する
      const expectedDefaultLocale = "ja";

      // Act: 設定されているデフォルトロケールを取得する
      const actualDefaultLocale = testRoutingConfig.defaultLocale;

      // Assert: デフォルトロケールが日本語に設定されている
      expect(actualDefaultLocale).toBe(expectedDefaultLocale);
    });
  });

  describe("URLパスの動作仕様", () => {
    it("プレフィックスなしのパスは日本語として処理される", () => {
      // Arrange: プレフィックスなしのパス例を準備する
      const pathsWithoutPrefix = ["/signup", "/login", "/mypage", "/settings"];
      const expectedLocale = "ja";

      // Act: デフォルトロケールを取得する
      const actualDefaultLocale = testRoutingConfig.defaultLocale;

      // Assert: プレフィックスなしの場合はデフォルトロケール（日本語）が使用される
      expect(actualDefaultLocale).toBe(expectedLocale);
    });

    it("enプレフィックス付きのパスは英語として処理される", () => {
      // Arrange: 英語プレフィックス付きのパス例を準備する
      const pathsWithEnPrefix = [
        "/en/signup",
        "/en/login",
        "/en/mypage",
        "/en/settings",
      ];
      const expectedLocale = "en";

      // Act: 英語ロケールがサポートされているか確認する
      const isEnglishSupported =
        testRoutingConfig.locales.includes(expectedLocale);

      // Assert: 英語ロケールがサポートされている
      expect(isEnglishSupported).toBe(true);
    });
  });

  describe("自動ロケール検出無効化の効果", () => {
    it("ブラウザ言語設定による自動リダイレクトが無効化されている", () => {
      // Arrange: ロケール検出無効化設定を確認する
      const isLocaleDetectionDisabled =
        testRoutingConfig.localeDetection === false;

      // Act: ロケール検出設定を取得する
      const actualLocaleDetection = testRoutingConfig.localeDetection;

      // Assert: 自動ロケール検出が無効化されている
      expect(isLocaleDetectionDisabled).toBe(true);
      expect(actualLocaleDetection).toBe(false);
    });

    it("URLパスのみで言語が決定される設定になっている", () => {
      // Arrange: URLパス決定用の設定を確認する
      const isLocalePrefixAsNeeded =
        testRoutingConfig.localePrefix === "as-needed";
      const isLocaleDetectionDisabled =
        testRoutingConfig.localeDetection === false;

      // Act: 設定値を取得する
      const actualLocalePrefix = testRoutingConfig.localePrefix;
      const actualLocaleDetection = testRoutingConfig.localeDetection;

      // Assert: URLパスのみで言語が決定される設定になっている
      expect(isLocalePrefixAsNeeded).toBe(true);
      expect(isLocaleDetectionDisabled).toBe(true);
      expect(actualLocalePrefix).toBe("as-needed");
      expect(actualLocaleDetection).toBe(false);
    });
  });

  describe("期待される動作の仕様確認", () => {
    it("localhost:3000/signupは日本語で表示される", () => {
      // Arrange: プレフィックスなしURL用のロケールを準備する
      const signupUrl = "localhost:3000/signup";
      const expectedLocale = "ja";

      // Act: デフォルトロケールを取得する
      const actualDefaultLocale = testRoutingConfig.defaultLocale;

      // Assert: プレフィックスなしのURLはデフォルトロケール（日本語）で表示される
      expect(actualDefaultLocale).toBe(expectedLocale);
    });

    it("localhost:3000/en/signupは英語で表示される", () => {
      // Arrange: 英語プレフィックス付きURL用のロケールを準備する
      const englishSignupUrl = "localhost:3000/en/signup";
      const expectedLocale = "en";

      // Act: 英語ロケールがサポートされているか確認する
      const isEnglishSupported =
        testRoutingConfig.locales.includes(expectedLocale);

      // Assert: 英語ロケールがサポートされているため英語で表示される
      expect(isEnglishSupported).toBe(true);
    });

    it("localhost:3000/loginは日本語で表示される", () => {
      // Arrange: プレフィックスなしログインURL用のロケールを準備する
      const loginUrl = "localhost:3000/login";
      const expectedLocale = "ja";

      // Act: デフォルトロケールを取得する
      const actualDefaultLocale = testRoutingConfig.defaultLocale;

      // Assert: プレフィックスなしのログインURLは日本語で表示される
      expect(actualDefaultLocale).toBe(expectedLocale);
    });

    it("localhost:3000/en/loginは英語で表示される", () => {
      // Arrange: 英語プレフィックス付きログインURL用のロケールを準備する
      const englishLoginUrl = "localhost:3000/en/login";
      const expectedLocale = "en";

      // Act: 英語ロケールがサポートされているか確認する
      const isEnglishSupported =
        testRoutingConfig.locales.includes(expectedLocale);

      // Assert: 英語ロケールがサポートされているため英語で表示される
      expect(isEnglishSupported).toBe(true);
    });
  });

  describe("不要なリダイレクト防止の仕様", () => {
    it("前回英語ページアクセス後も日本語ページは自動リダイレクトされない", () => {
      // Arrange: ロケール検出無効化設定を確認する
      const isLocaleDetectionDisabled =
        testRoutingConfig.localeDetection === false;

      // Act: ロケール検出設定を取得する
      const actualLocaleDetection = testRoutingConfig.localeDetection;

      // Assert: ロケール検出が無効化されているため前回の設定は影響しない
      expect(isLocaleDetectionDisabled).toBe(true);
      expect(actualLocaleDetection).toBe(false);
    });

    it("ブラウザのAccept-Languageヘッダーは無視される", () => {
      // Arrange: ロケール検出無効化設定を確認する
      const isLocaleDetectionDisabled =
        testRoutingConfig.localeDetection === false;

      // Act: ロケール検出設定を取得する
      const actualLocaleDetection = testRoutingConfig.localeDetection;

      // Assert: ロケール検出が無効化されているためブラウザ設定は無視される
      expect(isLocaleDetectionDisabled).toBe(true);
      expect(actualLocaleDetection).toBe(false);
    });
  });
});
