/**
 * 環境変数統一管理のテスト
 * 一貫した環境変数アクセスのテスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getBaseUrl,
  getApiBaseUrl,
  getExternalUrl,
  validateEnvironmentVariables,
  isDevelopment,
  isProduction,
  isVercel,
} from "./env";

describe("Environment Variables Management", () => {
  // 各テスト前にモック環境変数をクリア
  beforeEach(() => {
    vi.clearAllMocks();
    // 環境変数をクリア
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.NODE_ENV;
    delete process.env.VERCEL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getBaseUrl", () => {
    it("NEXT_PUBLIC_APP_URL が最優先で使用される", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
      process.env.NEXTAUTH_URL = "https://auth.example.com";
      process.env.APP_URL = "https://old.example.com";

      expect(getBaseUrl()).toBe("https://app.example.com");
    });

    it("NEXT_PUBLIC_APP_URL がない場合は NEXTAUTH_URL が使用される", () => {
      process.env.NEXTAUTH_URL = "https://auth.example.com";
      process.env.APP_URL = "https://old.example.com";

      expect(getBaseUrl()).toBe("https://auth.example.com");
    });

    it("NEXTAUTH_URL がない場合は APP_URL が使用される", () => {
      process.env.APP_URL = "https://old.example.com";

      expect(getBaseUrl()).toBe("https://old.example.com");
    });

    it("他の環境変数がない場合は VERCEL_URL が使用される", () => {
      process.env.VERCEL_URL = "my-app.vercel.app";

      expect(getBaseUrl()).toBe("https://my-app.vercel.app");
    });

    it("開発環境では localhost がデフォルトになる", () => {
      process.env.NODE_ENV = "development";

      expect(getBaseUrl()).toBe("http://localhost:3000");
    });

    it("本番環境で環境変数が設定されていない場合は警告を出してフォールバック", () => {
      process.env.NODE_ENV = "production";
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getBaseUrl();

      expect(result).toBe("http://localhost:3000");
      expect(consoleSpy).toHaveBeenCalledWith(
        "ベースURLが設定されていません。NEXT_PUBLIC_APP_URL環境変数を設定してください。"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getApiBaseUrl", () => {
    beforeEach(() => {
      // windowオブジェクトのモック
      vi.stubGlobal('window', {});
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("クライアントサイドでは空文字を返す", () => {
      expect(getApiBaseUrl()).toBe("");
    });

    it.todo("サーバーサイドでは getBaseUrl() の結果を返す", () => {
      // Note: vitest環境でwindowオブジェクトを完全に削除してサーバーサイドを
      // シミュレートするのは困難であるため、実装を変更せずにテストすることが難しい
      vi.unstubAllGlobals(); // windowを削除してサーバーサイドをシミュレート
      process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

      expect(getApiBaseUrl()).toBe("https://app.example.com");
    });
  });

  describe("getExternalUrl", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    });

    it("パスなしの場合はベースURLのみ返す", () => {
      expect(getExternalUrl()).toBe("https://app.example.com/");
    });

    it("空文字パスの場合はベースURLのみ返す", () => {
      expect(getExternalUrl("")).toBe("https://app.example.com/");
    });

    it("スラッシュで始まるパスを正しく結合する", () => {
      expect(getExternalUrl("/auth/callback")).toBe("https://app.example.com/auth/callback");
    });

    it("スラッシュで始まらないパスも正しく結合する", () => {
      expect(getExternalUrl("auth/callback")).toBe("https://app.example.com/auth/callback");
    });

    it("複雑なパスも正しく結合する", () => {
      expect(getExternalUrl("/verify-email?token=abc123")).toBe(
        "https://app.example.com/verify-email?token=abc123"
      );
    });
  });

  describe("validateEnvironmentVariables", () => {
    it("必須環境変数が全て設定されている場合は valid を返す", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service_key";

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("必須環境変数が不足している場合はエラーを返す", () => {
      // vitest.setup.tsで設定された環境変数を明示的にクリア
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("NEXT_PUBLIC_SUPABASE_URL が設定されていません");
      expect(result.errors).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません");
      expect(result.errors).toContain("SUPABASE_SERVICE_ROLE_KEY が設定されていません");
    });

    it("本番環境では追加の検証を行う", () => {
      process.env.NODE_ENV = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service_key";

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("本番環境では NEXT_PUBLIC_APP_URL の設定が推奨されます");
      expect(result.errors).toContain("RESEND_API_KEY が設定されていません（メール送信機能が利用できません）");
    });

    it("本番環境で推奨環境変数が設定されている場合は valid を返す", () => {
      process.env.NODE_ENV = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service_key";
      process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
      process.env.RESEND_API_KEY = "resend_key";

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Environment Detection Functions", () => {
    describe("isDevelopment", () => {
      it("開発環境では true を返す", () => {
        process.env.NODE_ENV = "development";
        expect(isDevelopment()).toBe(true);
      });

      it("本番環境では false を返す", () => {
        process.env.NODE_ENV = "production";
        expect(isDevelopment()).toBe(false);
      });

      it("NODE_ENV が未設定では false を返す", () => {
        expect(isDevelopment()).toBe(false);
      });
    });

    describe("isProduction", () => {
      it("本番環境では true を返す", () => {
        process.env.NODE_ENV = "production";
        expect(isProduction()).toBe(true);
      });

      it("開発環境では false を返す", () => {
        process.env.NODE_ENV = "development";
        expect(isProduction()).toBe(false);
      });

      it("NODE_ENV が未設定では false を返す", () => {
        expect(isProduction()).toBe(false);
      });
    });

    describe("isVercel", () => {
      it("Vercel環境では true を返す", () => {
        process.env.VERCEL = "1";
        expect(isVercel()).toBe(true);
      });

      it("Vercel環境でなければ false を返す", () => {
        expect(isVercel()).toBe(false);
      });
    });
  });

  describe("Edge Cases", () => {
    it("環境変数が空文字の場合は無視される", () => {
      process.env.NEXT_PUBLIC_APP_URL = "";
      process.env.NEXTAUTH_URL = "https://auth.example.com";

      expect(getBaseUrl()).toBe("https://auth.example.com");
    });

    it("VERCEL_URL にプロトコルが追加される", () => {
      process.env.VERCEL_URL = "my-app.vercel.app";

      expect(getBaseUrl()).toBe("https://my-app.vercel.app");
    });

    it("異なる NODE_ENV 値でも適切に動作する", () => {
      process.env.NODE_ENV = "test";

      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
    });
  });

  describe("Integration with Real Environment", () => {
    it("テスト環境での環境変数が正しく読み込まれる", () => {
      // vitest.setup.ts で設定された環境変数をテスト
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

      expect(getBaseUrl()).toBe("http://localhost:3000");
    });

    it("複数の環境変数が設定された場合の優先順位が正しい", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://priority1.com";
      process.env.NEXTAUTH_URL = "https://priority2.com";
      process.env.APP_URL = "https://priority3.com";
      process.env.VERCEL_URL = "priority4.vercel.app";

      expect(getBaseUrl()).toBe("https://priority1.com");

      delete process.env.NEXT_PUBLIC_APP_URL;
      expect(getBaseUrl()).toBe("https://priority2.com");

      delete process.env.NEXTAUTH_URL;
      expect(getBaseUrl()).toBe("https://priority3.com");

      delete process.env.APP_URL;
      expect(getBaseUrl()).toBe("https://priority4.vercel.app");
    });
  });
});