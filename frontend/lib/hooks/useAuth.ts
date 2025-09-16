"use client";

import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
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
	const { data: session, status } = useSession();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const signUp = async (data: SignUpFormData): Promise<SignUpResponse> => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/signup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "新規登録に失敗しました");
			}

			return result;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "新規登録に失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const signInWithCredentials = async (data: SignInFormData) => {
		setLoading(true);
		setError(null);

		try {
			const result = await signIn("credentials", {
				email: data.email,
				password: data.password,
				redirect: false,
			});

			if (result?.error) {
				throw new Error("メールアドレスまたはパスワードが正しくありません");
			}

			router.push("/personal/pages");
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "ログインに失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const signInWithGoogle = async () => {
		setLoading(true);
		setError(null);

		try {
			await signIn("google", {
				callbackUrl: "/personal/pages",
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Googleログインに失敗しました";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const signOutUser = async () => {
		setLoading(true);
		setError(null);

		try {
			await signOut({
				callbackUrl: "/login",
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "ログアウトに失敗しました";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const forgotPassword = async (data: ResetPasswordFormData) => {
		setLoading(true);
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
			setLoading(false);
		}
	};

	const resetPassword = async (token: string, data: NewPasswordFormData) => {
		setLoading(true);
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
			setLoading(false);
		}
	};

	const verifyEmail = async (token: string) => {
		setLoading(true);
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
			setLoading(false);
		}
	};

	return {
		session,
		status,
		loading,
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
