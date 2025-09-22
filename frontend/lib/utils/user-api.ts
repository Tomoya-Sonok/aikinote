import type { UserSession } from "@/lib/auth";
import type { ApiResponse } from "@/lib/types/api";

/**
 * ユーザープロフィール取得の共通関数
 * クライアントサイド・サーバーサイド両方で使用可能
 */
export async function fetchUserProfile(
	userId: string,
	options?: {
		baseUrl?: string;
		timeout?: number;
	},
): Promise<UserSession | null> {
	const { baseUrl = "", timeout = 5000 } = options || {};

	try {
		console.log("📡 [DEBUG] fetchUserProfile: API経由でユーザー取得開始", {
			userId,
			baseUrl,
		});

		// タイムアウト付きでfetch実行
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		const apiUrl = `${baseUrl}/api/user/${userId}`;
		console.log("📡 [DEBUG] fetchUserProfile: APIを呼び出し中", { apiUrl });

		const response = await fetch(apiUrl, {
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		console.log("📡 [DEBUG] fetchUserProfile: APIレスポンス受信", {
			status: response.status,
			statusText: response.statusText,
			ok: response.ok,
		});

		if (!response.ok) {
			console.error("📡 [DEBUG] fetchUserProfile: APIレスポンスエラー", {
				status: response.status,
				statusText: response.statusText,
			});
			return null;
		}

		const result: ApiResponse<UserSession> = await response.json();
		console.log("📡 [DEBUG] fetchUserProfile: JSON解析結果", {
			success: result.success,
			hasData: result.success ? !!result.data : false,
			rawData: result.data,
		});

		if (result.success && result.data) {
			// データの型チェック
			const userData = result.data;
			console.log("📡 [DEBUG] fetchUserProfile: ユーザーデータ詳細", {
				id: userData.id,
				email: userData.email,
				username: userData.username,
				profile_image_url: userData.profile_image_url,
				dojo_style_name: userData.dojo_style_name,
			});

			if (userData.id && userData.email && userData.username) {
				const userSession = {
					id: userData.id,
					email: userData.email,
					username: userData.username,
					profile_image_url: userData.profile_image_url || null,
					dojo_style_name: userData.dojo_style_name || null,
				};
				console.log(
					"📡 [DEBUG] fetchUserProfile: 最終的なUserSession",
					userSession,
				);
				return userSession;
			} else {
				console.error(
					"📡 [DEBUG] fetchUserProfile: 不正なユーザーデータ形式",
					userData,
				);
				return null;
			}
		} else {
			console.error(
				"📡 [DEBUG] fetchUserProfile: API経由でユーザー取得失敗:",
				result.error,
			);
			return null;
		}
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			console.error("📡 [DEBUG] fetchUserProfile: タイムアウトエラー", {
				userId,
				timeout,
			});
		} else {
			console.error(
				"📡 [DEBUG] fetchUserProfile: API呼び出し中にエラー:",
				error,
			);
		}
		return null;
	}
}

/**
 * ユーザー作成のための共通関数
 */
export async function createUserProfile(userData: {
	email: string;
	password: string;
	username: string;
}): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
	try {
		const response = await fetch("/api/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email: userData.email,
				password: userData.password,
				username: userData.username,
			}),
		});

		const result: ApiResponse = await response.json();

		if (!response.ok || !result.success) {
			return {
				success: false,
				error: result.success ? "ユーザー作成に失敗しました" : result.error,
			};
		}

		return {
			success: true,
			data: result.data,
			message: result.message,
		};
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "未知のエラーが発生しました",
		};
	}
}
