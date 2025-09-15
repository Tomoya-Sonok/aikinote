"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/hooks/useAuth";
import { generateUsernameFromEmail } from "@/lib/utils/auth";
import {
	type EmailPasswordFormData,
	type UsernameFormData,
	type SignUpFormData,
	emailPasswordSchema,
	usernameSchema,
} from "@/lib/utils/validation";

interface SignUpFormProps {
	onSuccess?: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
	const [step, setStep] = useState<"email-password" | "username">(
		"email-password",
	);

	const [emailPasswordData, setEmailPasswordData] = useState<{
		email: string;
		password: string;
	} | null>(null);
	const [showPassword, setShowPassword] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const { signUp, signInWithGoogle, loading, error, clearError } = useAuth();

	// ステップ1用のフォーム（メールアドレス・パスワード）
	const emailPasswordForm = useForm<EmailPasswordFormData>({
		resolver: zodResolver(emailPasswordSchema),
		mode: "onChange",
	});

	// ステップ2用のフォーム（ユーザー名）
	const usernameForm = useForm<UsernameFormData>({
		resolver: zodResolver(usernameSchema),
		mode: "onChange",
	});

	const watchedEmail = emailPasswordForm.watch("email");

	const handleEmailPasswordSubmit = async (data: EmailPasswordFormData) => {
		setEmailPasswordData(data);
		usernameForm.setValue("username", generateUsernameFromEmail(data.email));
		setStep("username");
		clearError();
	};

	const handleUsernameSubmit = async (data: UsernameFormData) => {
		if (!emailPasswordData) {
			console.error("No email/password data available!");
			return;
		}

		try {
			console.log("Calling signUp with complete data...");
			const result = await signUp({
				email: emailPasswordData.email,
				password: emailPasswordData.password,
				username: data.username,
			});

			console.log("SignUp result:", result);
			setSuccessMessage(result.message);
			onSuccess?.();
		} catch (err) {
			console.error("Sign up error:", err);
		}
	};

	const handleBack = () => {
		setStep("email-password");
		setEmailPasswordData(null);
		clearError();
	};

	const handleGoogleSignUp = async () => {
		try {
			await signInWithGoogle();
		} catch (err) {
			console.error("Google sign up error:", err);
		}
	};

	if (successMessage) {
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
						アカウント作成完了
					</h2>
					<p className="text-gray-600 mb-6">{successMessage}</p>
					<Link
						href="/login"
						className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
					>
						ログインページへ
					</Link>
				</div>
			</div>
		);
	}

	if (step === "email-password") {
		return (
			<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
				<h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
					新規登録
				</h2>

				{error && (
					<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
						{error}
					</div>
				)}

				<form
					onSubmit={emailPasswordForm.handleSubmit(
						(data) => {
							console.log("=== Form submitted with VALID data ===", data);
							console.log("Form errors:", emailPasswordForm.formState.errors);
							handleEmailPasswordSubmit(data);
						},
						(errors) => {
							console.log(
								"=== Form submitted with VALIDATION ERRORS ===",
								errors,
							);
							console.log("Detailed errors:", JSON.stringify(errors, null, 2));
						},
					)}
					className="space-y-4"
				>
					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							メールアドレス
						</label>
						<input
							{...emailPasswordForm.register("email")}
							type="email"
							id="email"
							onChange={(e) => {
								emailPasswordForm.register("email").onChange(e);
							}}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="example@domain.com"
						/>
						{emailPasswordForm.formState.errors.email && (
							<p className="mt-1 text-sm text-red-600">
								{emailPasswordForm.formState.errors.email.message}
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							パスワード
						</label>
						<div className="relative">
							<input
								{...emailPasswordForm.register("password")}
								type={showPassword ? "text" : "password"}
								id="password"
								onChange={(e) => {
									emailPasswordForm.register("password").onChange(e);
								}}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="パスワードを入力"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
							>
								{showPassword ? "隠す" : "表示"}
							</button>
						</div>
						{emailPasswordForm.formState.errors.password && (
							<p className="mt-1 text-sm text-red-600">
								{emailPasswordForm.formState.errors.password.message}
							</p>
						)}
						<p className="mt-1 text-xs text-gray-500">
							8〜128文字、大文字・小文字・数字・記号のうち3種類以上を含む
						</p>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? "処理中..." : "次へ"}
					</button>
				</form>

				<div className="mt-6">
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-white text-gray-500">または</span>
						</div>
					</div>

					<button
						onClick={handleGoogleSignUp}
						disabled={loading}
						className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Googleでアカウント作成
					</button>
				</div>

				<p className="mt-6 text-center text-sm text-gray-600">
					既にアカウントをお持ちですか？{" "}
					<Link href="/login" className="text-blue-600 hover:text-blue-500">
						ログイン
					</Link>
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
			<h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
				ユーザー名を設定
			</h2>

			{error && (
				<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					{error}
				</div>
			)}

			<form
				onSubmit={usernameForm.handleSubmit(handleUsernameSubmit)}
				className="space-y-4"
			>
				<div>
					<label
						htmlFor="username"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						ユーザー名
					</label>
					<input
						{...usernameForm.register("username")}
						type="text"
						id="username"
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="ユーザー名を入力"
					/>
					{usernameForm.formState.errors.username && (
						<p className="mt-1 text-sm text-red-600">
							{usernameForm.formState.errors.username.message}
						</p>
					)}
					<p className="mt-1 text-xs text-red-500 font-medium">
						※ ユーザー名は後から変更できません
					</p>
				</div>

				<div className="flex space-x-3">
					<button
						type="button"
						onClick={handleBack}
						className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
					>
						戻る
					</button>
					<button
						type="submit"
						disabled={loading}
						className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? "作成中..." : "アカウント作成"}
					</button>
				</div>
			</form>
		</div>
	);
}
