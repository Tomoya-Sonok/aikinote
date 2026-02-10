/**
 * OAuth認証コールバック処理のテスト
 * 直接データベースアクセスロジックのテスト
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// @supabase/ssrのモック
const mockSupabaseClient = {
  auth: {
    exchangeCodeForSession: vi.fn(),
  },
};

const mockServiceSupabase = {
  from: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => mockSupabaseClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleSupabase: () => mockServiceSupabase,
}));

vi.mock("@/lib/utils/auth-server", () => ({
  generateVerificationToken: () => "mock-token-123",
}));

vi.mock("@/lib/server/tag", () => ({
  initializeUserTagsIfNeeded: vi.fn(),
}));

// next/headersのモック
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

const getGlobalWithFetch = () =>
  globalThis as typeof globalThis & { fetch?: FetchMock };

describe("OAuth認証コールバック処理", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const globalWithFetch = getGlobalWithFetch();
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      headers: { get: () => null },
    } as unknown as Response);
    globalWithFetch.fetch = mockFetch;
  });

  afterEach(() => {
    vi.resetAllMocks();
    const globalWithFetch = getGlobalWithFetch();
    delete globalWithFetch.fetch;
  });

  it("新規ユーザーの場合に直接データベースアクセスでユーザーを作成する", async () => {
    const mockAuthData = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
    };

    // Supabase認証成功をシミュレート
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: mockAuthData,
      error: null,
    });

    // 既存ユーザーなしをシミュレート
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    // ユーザー作成成功をシミュレート
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "user-123", email: "test@example.com", username: "test" },
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    // タグ初期化成功をシミュレート
    const { initializeUserTagsIfNeeded } = await import("@/lib/server/tag");
    const mockedInitializeUserTagsIfNeeded = vi.mocked(
      initializeUserTagsIfNeeded,
    );
    mockedInitializeUserTagsIfNeeded.mockResolvedValue({
      success: true,
      data: [],
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=auth_code",
    );

    const response = await GET(request);

    // 直接データベースアクセスが正しく行われることを確認
    expect(mockServiceSupabase.from).toHaveBeenCalledWith("User");
    expect(mockSelect).toHaveBeenCalledWith("id, email, username");

    expect(mockInsert).toHaveBeenCalledWith({
      id: "user-123",
      email: "test@example.com",
      username: "test",
      profile_image_url: null,
      training_start_date: null,
      publicity_setting: "private",
      language: "ja",
      is_email_verified: true,
      verification_token: null,
      password_hash: "",
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });

    // リダイレクトが正しく行われることを確認
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/personal/pages",
    );
  });

  it("既存ユーザーの場合はユーザー作成をスキップする", async () => {
    const mockAuthData = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
    };

    const existingUser = {
      id: "user-123",
      email: "test@example.com",
      username: "existinguser",
    };

    // Supabase認証成功をシミュレート
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: mockAuthData,
      error: null,
    });

    // 既存ユーザーありをシミュレート
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: existingUser,
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=auth_code",
    );

    const response = await GET(request);

    // ユーザー存在チェックは行われる
    expect(mockServiceSupabase.from).toHaveBeenCalledWith("User");
    expect(mockSelect).toHaveBeenCalledWith("id, email, username");

    // ユーザー作成は行われない（insertメソッドは呼ばれない）
    expect(mockServiceSupabase.from).toHaveBeenCalledTimes(1);

    // リダイレクトが正しく行われることを確認
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/personal/pages",
    );
  });

  it("0.0.0.0でアクセスした場合でもlocalhostへリダイレクトする", async () => {
    const mockAuthData = {
      user: {
        id: "user-456",
        email: "sample@example.com",
      },
    };

    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: mockAuthData,
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "user-456",
            email: "sample@example.com",
            username: "sample",
          },
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    const request = new NextRequest(
      "http://0.0.0.0:3000/auth/callback?code=auth_code",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/personal/pages",
    );
  });

  it("ユーザー作成エラー時もリダイレクトを継続する", async () => {
    const mockAuthData = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
    };

    // Supabase認証成功をシミュレート
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: mockAuthData,
      error: null,
    });

    // 既存ユーザーなしをシミュレート
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    // ユーザー作成エラーをシミュレート
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=auth_code",
    );

    const response = await GET(request);

    // ユーザー作成は試行される
    expect(mockInsert).toHaveBeenCalled();

    // エラーがあってもリダイレクトは継続される
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/personal/pages",
    );
  });

  it("認証コード交換エラー時にログインページへリダイレクト", async () => {
    // Supabase認証エラーをシミュレート
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: "Invalid authorization code" },
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=invalid_code",
    );

    const response = await GET(request);

    // データベース関連の処理は行われない
    expect(mockServiceSupabase.from).not.toHaveBeenCalled();

    // エラーページへリダイレクト
    expect(response.status).toBe(307); // Note: Next.js 14+ では内部的に307が使用される
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=auth_error",
    );
  });

  it("認証コードがない場合にログインページへリダイレクト", async () => {
    const request = new NextRequest("http://localhost:3000/auth/callback");

    const response = await GET(request);

    // 認証処理は行われない
    expect(
      mockSupabaseClient.auth.exchangeCodeForSession,
    ).not.toHaveBeenCalled();
    expect(mockServiceSupabase.from).not.toHaveBeenCalled();

    // ログインページへリダイレクト
    expect(response.status).toBe(307); // Note: Next.js 14+ では内部的に307が使用される
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("ユーザー存在チェックでエラーが発生してもリダイレクトを継続する", async () => {
    const mockAuthData = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
    };

    // Supabase認証成功をシミュレート
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: mockAuthData,
      error: null,
    });

    // ユーザー存在チェックでエラーをシミュレート
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Network error" },
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=auth_code",
    );

    const response = await GET(request);

    // ユーザー作成は試行されない
    expect(mockServiceSupabase.from).toHaveBeenCalledTimes(1);

    // エラーがあってもリダイレクトは継続される
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/personal/pages",
    );
  });

  it("emailのローカル部分からusernameが正しく生成される", async () => {
    const testCases = [
      { email: "john.doe@example.com", expectedUsername: "john.doe" },
      { email: "user123@domain.co.jp", expectedUsername: "user123" },
      { email: "test+tag@gmail.com", expectedUsername: "test+tag" },
    ];

    for (const { email, expectedUsername } of testCases) {
      vi.clearAllMocks();

      const mockAuthData = {
        user: {
          id: "user-123",
          email,
        },
      };

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      // 既存ユーザーなしをシミュレート
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "user-123", email, username: expectedUsername },
            error: null,
          }),
        }),
      });

      mockServiceSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const request = new NextRequest(
        "http://localhost:3000/auth/callback?code=auth_code",
      );

      await GET(request);

      expect(mockInsert).toHaveBeenCalledWith({
        id: "user-123",
        email,
        username: expectedUsername,
        profile_image_url: null,
        training_start_date: null,
        publicity_setting: "private",
        language: "ja",
        is_email_verified: true,
        verification_token: null,
        password_hash: "",
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    }
  });

  it("Googleのavatarが1MB以下の場合はprofile_image_urlとして保存される", async () => {
    const mockAuthData = {
      user: {
        id: "user-123",
        email: "avatar@example.com",
        user_metadata: {
          avatar_url: "https://example.com/avatar.png",
        },
        identities: [
          {
            provider: "google",
            identity_data: {
              picture: "https://example.com/avatar.png",
            },
          },
        ],
      },
    };

    const globalWithFetch = getGlobalWithFetch();
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn(() => "500000"),
      },
    } as unknown as Response);
    globalWithFetch.fetch = mockFetch;

    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: mockAuthData,
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "user-123" },
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=auth_code",
    );

    await GET(request);

    expect(mockInsert).toHaveBeenCalledWith({
      id: "user-123",
      email: "avatar@example.com",
      username: "avatar",
      profile_image_url: "https://example.com/avatar.png",
      training_start_date: null,
      publicity_setting: "private",
      language: "ja",
      is_email_verified: true,
      verification_token: null,
      password_hash: "",
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });

    const fetchMock = globalWithFetch.fetch;
    if (!fetchMock) {
      throw new Error("Fetch mock is not defined");
    }
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/avatar.png", {
      method: "HEAD",
    });
  });

  it("avatarが1MBを超える場合はprofile_image_urlを保存しない", async () => {
    const mockAuthData = {
      user: {
        id: "user-123",
        email: "bigavatar@example.com",
        user_metadata: {
          picture: "https://example.com/big-avatar.png",
        },
      },
    };

    const globalWithFetch = getGlobalWithFetch();
    const oversizedFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn(() => "1500000"),
      },
    } as unknown as Response);
    globalWithFetch.fetch = oversizedFetch;

    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: mockAuthData,
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "user-123" },
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=auth_code",
    );

    await GET(request);

    expect(mockInsert).toHaveBeenCalledWith({
      id: "user-123",
      email: "bigavatar@example.com",
      username: "bigavatar",
      profile_image_url: null,
      training_start_date: null,
      publicity_setting: "private",
      language: "ja",
      is_email_verified: true,
      verification_token: null,
      password_hash: "",
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });

    const fetchOversized = globalWithFetch.fetch;
    if (!fetchOversized) {
      throw new Error("Fetch mock is not defined");
    }
    expect(fetchOversized).toHaveBeenCalledWith(
      "https://example.com/big-avatar.png",
      { method: "HEAD" },
    );
  });
});
