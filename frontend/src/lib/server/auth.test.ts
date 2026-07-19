/**
 * getVerifiedAuthUser / createBackendAuthToken のテスト
 * getClaims によるローカル検証と getUser フォールバックの分岐を検証する
 */
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBackendAuthToken, getVerifiedAuthUser } from "./auth";

const mockGetClaims = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => ({
    auth: {
      getClaims: mockGetClaims,
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/lib/server/cache", () => ({
  getCachedUserInfo: vi.fn(),
}));

describe("getVerifiedAuthUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getClaims が成功した場合、claims からユーザーを返し getUser は呼ばれない", async () => {
    // Arrange
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Act
    const user = await getVerifiedAuthUser();

    // Assert
    expect(user).toEqual({ id: "user-123", email: "test@example.com" });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("getClaims がエラーの場合、getUser にフォールバックしてユーザーを返す", async () => {
    // Arrange
    mockGetClaims.mockResolvedValue({
      data: null,
      error: new Error("jwks fetch failed"),
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Act
    const user = await getVerifiedAuthUser();

    // Assert
    expect(user).toEqual({ id: "user-123", email: "test@example.com" });
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it("getClaims が例外を投げた場合も getUser にフォールバックする", async () => {
    // Arrange
    mockGetClaims.mockRejectedValue(new Error("unexpected"));
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Act
    const user = await getVerifiedAuthUser();

    // Assert
    expect(user).toEqual({ id: "user-123", email: "test@example.com" });
  });

  it("未ログイン（getClaims も getUser もユーザーなし）の場合は null を返す", async () => {
    // Arrange
    mockGetClaims.mockResolvedValue({ data: null, error: null });
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth session missing"),
    });

    // Act
    const user = await getVerifiedAuthUser();

    // Assert
    expect(user).toBeNull();
  });

  it("claims に email が無い場合は空文字で補完する", async () => {
    // Arrange
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });

    // Act
    const user = await getVerifiedAuthUser();

    // Assert
    expect(user).toEqual({ id: "user-123", email: "" });
  });
});

describe("createBackendAuthToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("検証済みユーザーの userId / email を含む JWT を発行する", async () => {
    // Arrange
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Act
    const token = await createBackendAuthToken();

    // Assert
    expect(token).not.toBeNull();
    const payload = jwt.decode(token as string) as {
      userId: string;
      email: string;
    };
    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });

  it("未認証の場合は null を返す", async () => {
    // Arrange
    mockGetClaims.mockResolvedValue({ data: null, error: null });
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth session missing"),
    });

    // Act
    const token = await createBackendAuthToken();

    // Assert
    expect(token).toBeNull();
  });
});
