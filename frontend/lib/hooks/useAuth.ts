"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { UserSession } from "@/lib/auth";
import { getClientSupabase } from "@/lib/supabase/client";
import { generateUsernameFromEmail } from "@/lib/utils/auth-client";
import { fetchUserProfile, createUserProfile } from "@/lib/utils/user-api";
import { getExternalUrl } from "@/lib/utils/env";
import type {
	NewPasswordFormData,
	ResetPasswordFormData,
	SignInFormData,
	SignUpFormData,
} from "@/lib/utils/validation";

interface SignUpResponse {
	message: string;
	userId?: string;
}

export function useAuth() {
	const [user, setUser] = useState<UserSession | null>(null);
	const [isInitializing, setIsInitializing] = useState(true);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const supabase = useMemo(() => {
		return getClientSupabase();
	}, []);

	useEffect(() => {
		let isMounted = true;

		const supabaseClient = getClientSupabase();

		// 共通のユーザー取得関数を使用

		const applySession = async (session: Session | null) => {
			if (!isMounted) return;

			if (session?.user) {
				const userProfile = await fetchUserProfile(session.user.id);

				if (userProfile && isMounted) {
					setUser(userProfile);
					return;
				}
			}

			if (isMounted) {
				setUser(null);
			}
		};

		const initializeSession = async () => {
			setIsInitializing(true);
			try {
				// タイムアウト付きでセッション取得
				const sessionPromise = supabaseClient.auth.getSession();
				const timeoutPromise = new Promise((_, reject) =>
					setTimeout(
						() => reject(new Error("セッション取得がタイムアウトしました")),
						10000,
					),
				);

				const result = (await Promise.race([
					sessionPromise,
					timeoutPromise,
				])) as any;
				const {
					data: { session },
					error,
				} = result;


				if (error) {
					console.error("セッション取得エラー:", error);
					setUser(null);
					return;
				}

				if (isMounted) {
					await applySession(session);
				}
			} catch (error) {
				console.error("セッション初期化中に予期せぬエラー:", error);
				if (isMounted) {
					setUser(null);
				}
			} finally {
				if (isMounted) {
					setIsInitializing(false);
				}
			}
		};

		void initializeSession();

		// セッション変更の監視を有効化（改善されたエラーハンドリング付き）
		const {
			data: { subscription },
		} = supabaseClient.auth.onAuthStateChange(async (event, session) => {
			// 初期化中でない場合のみ処理
			if (!isInitializing && isMounted) {
				setIsInitializing(true);
				try {
					await applySession(session);
				} catch (error) {
					console.error("認証状態変更処理中にエラー:", error);
					if (isMounted) {
						setUser(null);
						// ネットワークエラー以外の場合はエラー状態を設定
						if (error instanceof Error && !error.message.includes("ネットワーク")) {
							setError("認証状態の更新中にエラーが発生しました");
						}
					}
				} finally {
					if (isMounted) {
						setIsInitializing(false);
					}
				}
			}
		});

		return () => {
			isMounted = false;
			subscription.unsubscribe();
		};
	}, [supabase]); // supabaseを依存配列に戻す

	const signUp = async (data: SignUpFormData): Promise<SignUpResponse> => {
		setIsProcessing(true);
		setError(null);

		try {
			const { data: authData, error } = await supabase.auth.signUp({
				email: data.email,
				password: data.password,
				options: {
					data: {
						username: data.username,
						dojo_id: data.dojoId || null,
					},
				},
			});

			if (error) {
				throw new Error(error.message || "新規登録に失敗しました");
			}

			if (authData?.user) {
				const userResult = await createUserProfile({
					id: authData.user.id,
					email: data.email,
					username: data.username,
					dojo_id: data.dojoId || null,
				});

				if (!userResult.success) {
					throw new Error(userResult.error || "ユーザー情報の初期化に失敗しました");
				}
			}

			return { message: "新規登録が完了しました", userId: authData?.user?.id };
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "新規登録に失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsProcessing(false);
		}
	};

	const signInWithCredentials = async (data: SignInFormData) => {
		setIsProcessing(true);
		setError(null);

		try {
			const { error } = await supabase.auth.signInWithPassword({
				email: data.email,
				password: data.password,
			});

			if (error) {
				throw new Error("メールアドレスまたはパスワードが正しくありません");
			}

			// セッション確立を待つ
			await new Promise((resolve) => setTimeout(resolve, 100));

			// ログイン成功後のリダイレクト
			router.push("/personal/pages");
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "ログインに失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsProcessing(false);
		}
	};

	const signInWithGoogle = async () => {
		setIsProcessing(true);
		setError(null);

		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: getExternalUrl("/auth/callback"),
				},
			});

			if (error) {
				throw new Error(error.message || "Googleログインに失敗しました");
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Googleログインに失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsProcessing(false);
		}
	};

	const signOutUser = async () => {
		setIsProcessing(true);
		setError(null);

		try {

			// タイムアウト付きでSupabaseのサインアウトを実行
			const signOutPromise = supabase.auth.signOut();
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(
					() =>
						reject(
							new Error("Supabaseサインアウトがタイムアウトしました（10秒）"),
						),
					10000,
				),
			);

			const { error } = (await Promise.race([
				signOutPromise,
				timeoutPromise,
			])) as any;

			if (error) {
				console.error("signOutUser: Supabaseサインアウトエラー", error);
			}

			// エラーがあってもなくても、ローカル状態をクリアしてリダイレクト
			setUser(null);

			router.push("/");
		} catch (err) {
			console.warn(
				"signOutUser: Supabaseサインアウトでタイムアウト/エラーが発生しましたが、ローカルログアウトを実行します",
				err,
			);
			// エラーが発生してもユーザー状態をクリアしてリダイレクト
			setUser(null);
			router.push("/");
			// タイムアウトの場合は特にエラーとして扱わない
			if (err instanceof Error && err.message.includes("タイムアウト")) {
				// タイムアウトの場合は特にログ出力しない
			} else {
				const errorMessage =
					err instanceof Error ? err.message : "ログアウトに失敗しました";
				setError(errorMessage);
			}
		} finally {
			setIsProcessing(false);
		}
	};

	const forgotPassword = async (data: ResetPasswordFormData) => {
		setIsProcessing(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "パスワードリセット要求に失敗しました");
			}

			return result;
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "パスワードリセット要求に失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsProcessing(false);
		}
	};

	const resetPassword = async (token: string, data: NewPasswordFormData) => {
		setIsProcessing(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					token,
					password: data.password,
					confirmPassword: data.confirmPassword,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "パスワードリセットに失敗しました");
			}

			return result;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "パスワードリセットに失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsProcessing(false);
		}
	};

	const verifyEmail = async (token: string) => {
		setIsProcessing(true);
		setError(null);

		try {
			const url = `/api/auth/verify-email?token=${token}`;

			const response = await fetch(url, {
				method: "POST",
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "メール認証に失敗しました");
			}

			return result;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "メール認証に失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsProcessing(false);
		}
	};

	return {
		user,
		loading: isInitializing || isProcessing,
		isInitializing,
		isProcessing,
		error,
		signUp,
		signInWithCredentials,
		signInWithGoogle,
		signOutUser,
		forgotPassword,
		resetPassword,
		verifyEmail,
		clearError: () => setError(null),
	};
}
