"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

interface EmailVerificationFormProps {
	token: string;
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

export function EmailVerificationForm({
	token,
	onSuccess,
	onError,
}: EmailVerificationFormProps) {
	const [verificationStatus, setVerificationStatus] = useState<
		"loading" | "success" | "error"
	>("loading");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const { verifyEmail } = useAuth();

	useEffect(() => {
		console.log("=== EmailVerificationForm useEffect called ===");
		console.log("Token:", token ? `${token.slice(0, 10)}...` : "NULL");
		console.log("Verification status:", verificationStatus);

		const performVerification = async () => {
			try {
				console.log("=== Starting email verification ===");
				console.log(
					"Calling verifyEmail with token:",
					token ? `${token.slice(0, 10)}...` : "NULL",
				);

				await verifyEmail(token);

				console.log("=== Email verification successful ===");
				setVerificationStatus("success");
				onSuccess?.();
			} catch (err) {
				console.error("=== Email verification failed ===", err);
				const message =
					err instanceof Error ? err.message : "メール認証に失敗しました";
				setErrorMessage(message);
				setVerificationStatus("error");
				onError?.(message);
			}
		};

		if (token && verificationStatus === "loading") {
			console.log("=== Performing verification ===");
			performVerification();
		} else if (!token) {
			console.log("=== No token provided ===");
			setErrorMessage("認証トークンが無効です");
			setVerificationStatus("error");
		} else {
			console.log(
				"=== Skipping verification (already processed or no token) ===",
			);
		}
	}, [token, verifyEmail, onSuccess, onError, verificationStatus]);

	if (verificationStatus === "loading") {
		return (
			<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
				<div className="text-center">
					<div className="mb-4">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					</div>
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						メール認証中
					</h2>
					<p className="text-gray-600">
						メールアドレスの認証を処理しています。しばらくお待ちください...
					</p>
				</div>
			</div>
		);
	}

	if (verificationStatus === "success") {
		return (
			<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
				<div className="text-center">
					<div className="mb-4 text-green-600">
						<svg
							className="mx-auto h-12 w-12"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						メール認証完了
					</h2>
					<p className="text-gray-600 mb-6">
						メールアドレスの認証が完了しました！
					</p>
					<Link
						href="/personal/pages"
						className="inline-block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center font-medium"
					>
						AikiNoteを使ってみる
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
			<div className="text-center">
				<div className="mb-4 text-red-600">
					<svg
						className="mx-auto h-12 w-12"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L5.351 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h2 className="text-xl font-semibold text-gray-900 mb-2">
					認証に失敗しました
				</h2>
				<p className="text-gray-600 mb-4">{errorMessage}</p>

				<div className="space-y-3">
					<p className="text-sm text-gray-500">認証に失敗する原因：</p>
					<ul className="text-sm text-gray-500 text-left space-y-1">
						<li>• 認証リンクの有効期限が切れている（1時間）</li>
						<li>• 既に認証済みのアカウント</li>
						<li>• 無効な認証トークン</li>
					</ul>
				</div>

				<div className="mt-6 space-y-3">
					<Link
						href="/signup"
						className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
					>
						新規登録をやり直す
					</Link>
					<Link
						href="/login"
						className="block w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
					>
						ログインページへ
					</Link>
				</div>
			</div>
		</div>
	);
}
