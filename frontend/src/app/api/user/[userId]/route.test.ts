/**
 * /api/user/[userId] APIルートのテスト
 * Service Role使用最適化と権限チェックのテスト
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Supabaseクライアントのモック
const mockServerSupabase = {
  auth: {
    getSession: vi.fn(),
  },
};

const mockServiceSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => mockServerSupabase,
  getServiceRoleSupabase: () => mockServiceSupabase,
}));

describe("/api/user/[userId] GET エンドポイント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("本人のプロフィール取得時に成功する", async () => {
    const userId = "user-123";
    const mockUser = {
      id: userId,
      email: "test@example.com",
      username: "testuser",
      profile_image_url: "https://example.com/avatar.jpg",
      dojo_style_name: "合気会",
      is_email_verified: true,
    };

    // セッションありをシミュレート（本人）
    mockServerSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: userId },
        },
      },
      error: null,
    });

    // Service Roleでのユーザー取得成功をシミュレート
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    const request = new NextRequest("http://localhost:3000/api/user/user-123");
    const response = await GET(request, { params: { userId } });

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toEqual(mockUser); // 本人なので全情報が含まれる
  });

  it("他人のプロフィール取得時に詳細情報を隠す", async () => {
    const userId = "user-123";
    const requestingUserId = "user-456";
    const mockUser = {
      id: userId,
      email: "test@example.com",
      username: "testuser",
      profile_image_url: "https://example.com/avatar.jpg",
      dojo_style_name: "合気会",
      is_email_verified: true,
    };

    // セッションありをシミュレート（他人）
    mockServerSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: requestingUserId },
        },
      },
      error: null,
    });

    // Service Roleでのユーザー取得成功をシミュレート
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    const request = new NextRequest("http://localhost:3000/api/user/user-123");
    const response = await GET(request, { params: { userId } });

    expect(response.status).toBe(403); // 他人のプロフィールアクセスは現在403
  });

  it("セッションなし（内部APIコール）でアクセス許可", async () => {
    const userId = "user-123";
    const mockUser = {
      id: userId,
      email: "test@example.com",
      username: "testuser",
      profile_image_url: null,
      dojo_style_name: null,
      is_email_verified: false,
    };

    // セッションなしをシミュレート
    mockServerSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Service Roleでのユーザー取得成功をシミュレート
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    // 内部API呼び出しをシミュレート（originなし）
    const request = new NextRequest("http://localhost:3000/api/user/user-123");

    const response = await GET(request, { params: { userId } });

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    // セッションなしなので詳細情報は含まれない
    expect(responseData.data).toEqual({
      id: userId,
      email: "test@example.com",
      username: "testuser",
      profile_image_url: null,
    });
  });

  it("ユーザーが存在しない場合に404を返す", async () => {
    // Arrange
    const userId = "nonexistent-user";

    mockServerSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: userId },
        },
      },
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

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    // Act
    const request = new NextRequest(
      "http://localhost:3000/api/user/nonexistent-user",
    );
    const response = await GET(request, { params: { userId } });

    // Assert
    expect(response.status).toBe(404);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe("NOT_FOUND");
  });

  it("データベースエラー時に500を返す", async () => {
    // Arrange
    const userId = "user-123";

    mockServerSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: userId },
        },
      },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    // Act
    const request = new NextRequest("http://localhost:3000/api/user/user-123");
    const response = await GET(request, { params: { userId } });

    // Assert
    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe("INTERNAL_SERVER_ERROR");
  });

  it("予期しないエラー時に500を返す", async () => {
    // Arrange
    const userId = "user-123";

    mockServerSupabase.auth.getSession.mockRejectedValue(
      new Error("Unexpected error"),
    );

    // Act
    const request = new NextRequest("http://localhost:3000/api/user/user-123");
    const response = await GET(request, { params: { userId } });

    // Assert
    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe("INTERNAL_SERVER_ERROR");
  });

  it("必要なフィールドのみを選択して取得する", async () => {
    const userId = "user-123";

    // セッションありをシミュレート
    mockServerSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: userId },
        },
      },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: userId },
          error: null,
        }),
      }),
    });

    mockServiceSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    const request = new NextRequest("http://localhost:3000/api/user/user-123");
    await GET(request, { params: { userId } });

    // セキュリティを考慮して必要なフィールドのみ選択
    expect(mockSelect).toHaveBeenCalledWith(
      "id, email, username, profile_image_url, dojo_style_name, is_email_verified",
    );
  });
});
