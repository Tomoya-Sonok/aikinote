/**
 * ユーザーAPI共通関数のテスト
 * tRPCラッパー経由のユーザー取得・作成ロジックを検証
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserProfileViaTrpc, getUserProfile } from "@/lib/api/client";
import { createUserProfile, fetchUserProfile } from "./user";

vi.mock("@/lib/api/client", () => ({
  createUserProfileViaTrpc: vi.fn(),
  getUserProfile: vi.fn(),
}));

const mockGetUserProfile = vi.mocked(getUserProfile);
const mockCreateUserProfileViaTrpc = vi.mocked(createUserProfileViaTrpc);

describe("fetchUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常にユーザープロフィールを取得できる", async () => {
    // Arrange
    mockGetUserProfile.mockResolvedValue({
      success: true,
      data: {
        id: "user-123",
        email: "test@example.com",
        username: "testuser",
        profile_image_url: "https://example.com/avatar.jpg",
        dojo_style_name: null,
        training_start_date: null,
      },
    });

    // Act
    const result = await fetchUserProfile("user-123");

    // Assert
    expect(result).toEqual({
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      profile_image_url: "https://example.com/avatar.jpg",
      dojo_style_name: null,
    });
  });

  it("success falseの場合にnullを返す", async () => {
    // Arrange
    mockGetUserProfile.mockResolvedValue({
      success: false,
      error: "User not found",
    });

    // Act
    const result = await fetchUserProfile("user-123");

    // Assert
    expect(result).toBeNull();
  });

  it("不正なデータ形式の場合にnullを返す", async () => {
    // Arrange
    mockGetUserProfile.mockResolvedValue({
      success: true,
      data: {
        id: "",
        email: "test@example.com",
        username: "testuser",
        profile_image_url: null,
        dojo_style_name: null,
        training_start_date: null,
      },
    });

    // Act
    const result = await fetchUserProfile("user-123");

    // Assert
    expect(result).toBeNull();
  });

  it("tRPC呼び出しエラー時にnullを返す", async () => {
    // Arrange
    mockGetUserProfile.mockRejectedValue(new Error("Network error"));

    // Act
    const result = await fetchUserProfile("user-123");

    // Assert
    expect(result).toBeNull();
  });
});

describe("createUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常にユーザープロフィールを作成できる", async () => {
    // Arrange
    mockCreateUserProfileViaTrpc.mockResolvedValue({
      success: true,
      data: { id: "user-123", email: "test@example.com", username: "testuser" },
      message: "登録成功",
    });

    // Act
    const result = await createUserProfile({
      email: "test@example.com",
      password: "password123",
      username: "testuser",
    });

    // Assert
    expect(result).toEqual({
      success: true,
      data: { id: "user-123", email: "test@example.com", username: "testuser" },
      message: "登録成功",
    });
  });

  it("APIエラー時に適切なエラーを返す", async () => {
    // Arrange
    mockCreateUserProfileViaTrpc.mockResolvedValue({
      success: false,
      error: "Email already exists",
    });

    // Act
    const result = await createUserProfile({
      email: "test@example.com",
      password: "password123",
      username: "testuser",
    });

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Email already exists",
    });
  });

  it("エラーメッセージ未設定時にデフォルト文言を返す", async () => {
    // Arrange
    mockCreateUserProfileViaTrpc.mockResolvedValue({
      success: false,
      error: "",
    } as never);

    // Act
    const result = await createUserProfile({
      email: "test@example.com",
      password: "password123",
      username: "testuser",
    });

    // Assert
    expect(result).toEqual({
      success: false,
      error: "ユーザー作成に失敗しました",
    });
  });

  it("tRPC呼び出しエラー時にエラーメッセージを返す", async () => {
    // Arrange
    mockCreateUserProfileViaTrpc.mockRejectedValue(
      new Error("Network connection failed"),
    );

    // Act
    const result = await createUserProfile({
      email: "test@example.com",
      password: "password123",
      username: "testuser",
    });

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Network connection failed",
    });
  });
});
