import { describe, test, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import usersRoute from "./users.js";
import { generateToken } from "../lib/jwt.js";

// Supabaseクライアントのモック関数
const mockSingle = vi.fn();
const mockUpdateSingle = vi.fn();

// モジュールのモック
vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => ({
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: mockSingle,
				})),
			})),
			update: vi.fn(() => ({
				eq: vi.fn(() => ({
					select: vi.fn(() => ({
						single: mockUpdateSingle,
					})),
				})),
			})),
		})),
	})),
}));

// 環境変数の設定
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.JWT_SECRET = "test-secret-key-for-testing";

describe("ユーザープロフィールAPI", () => {
	let app: Hono;
	let validToken: string;
	const testUserId = "550e8400-e29b-41d4-a716-446655440000";
	const otherUserId = "550e8400-e29b-41d4-a716-446655440001";

	beforeEach(() => {
		app = new Hono();
		app.route("/api/users", usersRoute);

		// 有効なJWTトークンを生成
		validToken = generateToken({
			userId: testUserId,
			email: "test@example.com",
		});

		// モックをリセット
		vi.clearAllMocks();
		mockSingle.mockClear();
		mockUpdateSingle.mockClear();
	});

	describe("プロフィール取得API", () => {
		test("認証済みユーザーが自分のプロフィールを正常に取得できる", async () => {
			// Arrange
			const expectedUserData = {
				id: testUserId,
				email: "test@example.com",
				username: "テストユーザー",
				profile_image_url: "https://example.com/profile.jpg",
				dojo_style_name: "合気会",
				training_start_date: "2020年頃",
			};

			mockSingle.mockResolvedValue({
				data: expectedUserData,
				error: null,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${validToken}`,
				},
			});

			// Assert
			expect(response.status).toBe(200);
			const responseData = await response.json();
			expect(responseData.success).toBe(true);
			expect(responseData.data).toEqual(expectedUserData);
			expect(responseData.message).toBe("ユーザー情報を取得しました");
		});

		test("認証ヘッダーが無い場合は401エラーを返す", async () => {
			// Arrange & Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "GET",
			});

			// Assert
			expect(response.status).toBe(401);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("認証に失敗しました");
		});

		test("無効なJWTトークンの場合は401エラーを返す", async () => {
			// Arrange
			const invalidToken = "invalid-jwt-token";

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${invalidToken}`,
				},
			});

			// Assert
			expect(response.status).toBe(401);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("認証に失敗しました");
		});

		test("他のユーザーのプロフィールを取得しようとすると403エラーを返す", async () => {
			// Arrange & Act
			const response = await app.request(`/api/users/${otherUserId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${validToken}`,
				},
			});

			// Assert
			expect(response.status).toBe(403);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("他のユーザーのプロフィールは取得できません");
		});

		test("ユーザーが存在しない場合は404エラーを返す", async () => {
			// Arrange
			mockSingle.mockResolvedValue({
				data: null,
				error: null,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${validToken}`,
				},
			});

			// Assert
			expect(response.status).toBe(404);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("ユーザーが見つかりません");
		});

		test("データベースエラーが発生した場合は500エラーを返す", async () => {
			// Arrange
			const databaseError = new Error("Database connection failed");
			mockSingle.mockResolvedValue({
				data: null,
				error: databaseError,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${validToken}`,
				},
			});

			// Assert
			expect(response.status).toBe(500);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("ユーザー情報の取得に失敗しました");
		});
	});

	describe("プロフィール更新API", () => {
		test("認証済みユーザーが自分のプロフィールを正常に更新できる", async () => {
			// Arrange
			const updateData = {
				username: "更新されたユーザー名",
				dojo_style_name: "養神館",
				training_start_date: "2021年頃",
			};

			const updatedUserData = {
				id: testUserId,
				email: "test@example.com",
				username: "更新されたユーザー名",
				profile_image_url: "https://example.com/profile.jpg",
				dojo_style_name: "養神館",
				training_start_date: "2021年頃",
			};

			mockUpdateSingle.mockResolvedValue({
				data: updatedUserData,
				error: null,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validToken}`,
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(200);
			const responseData = await response.json();
			expect(responseData.success).toBe(true);
			expect(responseData.data).toEqual(updatedUserData);
			expect(responseData.message).toBe("プロフィールを更新しました");
		});

		test("ユーザー名のみを更新できる", async () => {
			// Arrange
			const updateData = {
				username: "新しいユーザー名",
			};

			const updatedUserData = {
				id: testUserId,
				email: "test@example.com",
				username: "新しいユーザー名",
				profile_image_url: "https://example.com/profile.jpg",
				dojo_style_name: "合気会",
				training_start_date: "2020年頃",
			};

			mockUpdateSingle.mockResolvedValue({
				data: updatedUserData,
				error: null,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validToken}`,
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(200);
			const responseData = await response.json();
			expect(responseData.success).toBe(true);
			expect(responseData.data.username).toBe("新しいユーザー名");
		});

		test("道場名のみを更新できる", async () => {
			// Arrange
			const updateData = {
				dojo_style_name: "心身統一合気道",
			};

			const updatedUserData = {
				id: testUserId,
				email: "test@example.com",
				username: "テストユーザー",
				profile_image_url: "https://example.com/profile.jpg",
				dojo_style_name: "心身統一合気道",
				training_start_date: "2020年頃",
			};

			mockUpdateSingle.mockResolvedValue({
				data: updatedUserData,
				error: null,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validToken}`,
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(200);
			const responseData = await response.json();
			expect(responseData.success).toBe(true);
			expect(responseData.data.dojo_style_name).toBe("心身統一合気道");
		});

		test("訓練開始日のみを更新できる", async () => {
			// Arrange
			const updateData = {
				training_start_date: "約5年前",
			};

			const updatedUserData = {
				id: testUserId,
				email: "test@example.com",
				username: "テストユーザー",
				profile_image_url: "https://example.com/profile.jpg",
				dojo_style_name: "合気会",
				training_start_date: "約5年前",
			};

			mockUpdateSingle.mockResolvedValue({
				data: updatedUserData,
				error: null,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validToken}`,
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(200);
			const responseData = await response.json();
			expect(responseData.success).toBe(true);
			expect(responseData.data.training_start_date).toBe("約5年前");
		});

		test("認証ヘッダーが無い場合は401エラーを返す", async () => {
			// Arrange
			const updateData = {
				username: "更新されたユーザー名",
			};

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(401);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("認証に失敗しました");
		});

		test("他のユーザーのプロフィールを更新しようとすると403エラーを返す", async () => {
			// Arrange
			const updateData = {
				username: "更新されたユーザー名",
			};

			// Act
			const response = await app.request(`/api/users/${otherUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validToken}`,
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(403);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("他のユーザーのプロフィールは更新できません");
		});

		test("長すぎるユーザー名の場合は400エラーを返す", async () => {
			// Arrange
			const updateData = {
				username: "a".repeat(21), // 21文字の長いユーザー名
			};

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validToken}`,
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("ユーザー名は20文字以内で入力してください");
		});

		test("データベース更新エラーが発生した場合は500エラーを返す", async () => {
			// Arrange
			const updateData = {
				username: "更新されたユーザー名",
			};

			const databaseError = new Error("Database update failed");
			mockUpdateSingle.mockResolvedValue({
				data: null,
				error: databaseError,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validToken}`,
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(500);
			const responseData = await response.json();
			expect(responseData.success).toBe(false);
			expect(responseData.error).toBe("プロフィールの更新に失敗しました");
		});

		test("空のリクエストボディでも正常に処理される", async () => {
			// Arrange
			const updateData = {};

			const originalUserData = {
				id: testUserId,
				email: "test@example.com",
				username: "テストユーザー",
				profile_image_url: "https://example.com/profile.jpg",
				dojo_style_name: "合気会",
				training_start_date: "2020年頃",
			};

			mockUpdateSingle.mockResolvedValue({
				data: originalUserData,
				error: null,
			});

			// Act
			const response = await app.request(`/api/users/${testUserId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validToken}`,
				},
				body: JSON.stringify(updateData),
			});

			// Assert
			expect(response.status).toBe(200);
			const responseData = await response.json();
			expect(responseData.success).toBe(true);
			expect(responseData.data).toEqual(originalUserData);
		});
	});
});