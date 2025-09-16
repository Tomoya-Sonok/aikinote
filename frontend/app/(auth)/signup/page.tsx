"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { EmailVerificationWaitingForm } from "@/components/auth/EmailVerificationWaitingForm";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import { generateUsernameFromEmail } from "@/lib/utils/auth";
import {
	type EmailPasswordFormData,
	emailPasswordSchema,
	type UsernameFormData,
	usernameSchema,
} from "@/lib/utils/validation";
import styles from "./page.module.css";

interface SignUpPageProps {
	onSuccess?: () => void;
}

export default function SignUpPage({ onSuccess }: SignUpPageProps) {
	const [step, setStep] = useState<"email-password" | "username">(
		"email-password",
	);
	const usernameId = useId();
	const emailId = useId();
	const passwordId = useId();

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
		return <EmailVerificationWaitingForm />;
	}

	if (step === "email-password") {
		return (
			<AppLayout>
				<div className={styles.container}>
					<h1 className={styles.title}>新規登録</h1>

					<div className={styles.formCard}>
						{/* ステップインジケーター */}
						<div className={styles.stepContainer}>
							<div className={styles.stepInfo}>
								<div className={styles.stepHeader}>
									<span className={styles.stepText}>ステップ 1/4</span>
								</div>
								<div className={styles.progressContainer}>
									<div
										className={`${styles.progressBar} ${styles.progressStep1}`}
									/>
								</div>
							</div>
							<div className={styles.stepDots}>
								<div className={`${styles.stepDot} ${styles.stepDotActive}`} />
								<div className={styles.stepDot} />
								<div className={styles.stepDot} />
								<div className={styles.stepDot} />
							</div>
						</div>

						{error && <div className={styles.errorMessage}>{error}</div>}

						<div className={styles.contentsWrapper}>
							<form
								className={styles.form}
								onSubmit={emailPasswordForm.handleSubmit(
									(data) => {
										console.log("=== Form submitted with VALID data ===", data);
										console.log(
											"Form errors:",
											emailPasswordForm.formState.errors,
										);
										handleEmailPasswordSubmit(data);
									},
									(errors) => {
										console.log(
											"=== Form submitted with VALIDATION ERRORS ===",
											errors,
										);
										console.log(
											"Detailed errors:",
											JSON.stringify(errors, null, 2),
										);
									},
								)}
							>
								<div className={styles.fieldGroup}>
									<label htmlFor={emailId} className={styles.fieldLabel}>
										メールアドレス
									</label>
									<div className={styles.inputContainer}>
										<input
											{...emailPasswordForm.register("email")}
											type="email"
											id={emailId}
											className={`${styles.inputField} ${
												emailPasswordForm.formState.errors.email
													? styles.error
													: ""
											}`}
											placeholder="aaaa@example.com"
										/>
									</div>
									{emailPasswordForm.formState.errors.email && (
										<p className={styles.errorMessage}>
											{emailPasswordForm.formState.errors.email.message}
										</p>
									)}
								</div>

								<div className={styles.fieldGroup}>
									<label htmlFor={passwordId} className={styles.fieldLabel}>
										パスワード
									</label>
									<div className={styles.inputContainer}>
										<input
											{...emailPasswordForm.register("password")}
											type={showPassword ? "text" : "password"}
											id={passwordId}
											className={`${styles.inputField} ${
												emailPasswordForm.formState.errors.password
													? styles.error
													: ""
											}`}
											placeholder="Password123!"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className={styles.passwordToggle}
										>
											{showPassword ? "隠す" : "表示"}
										</button>
									</div>
									{emailPasswordForm.formState.errors.password && (
										<p className={styles.errorMessage}>
											{emailPasswordForm.formState.errors.password.message}
										</p>
									)}
									<p className={styles.helpText}>
										◆ 8文字以上
										<br />◆
										半角アルファベットの大文字・小文字・数字・記号のうち3種類以上を含む
									</p>
								</div>

								<div className={styles.buttonContainer}>
									<button
										type="submit"
										disabled={loading}
										className={`${styles.button} ${styles.primaryButton}`}
									>
										{loading ? "処理中..." : "次へ進む"}
									</button>
								</div>
							</form>

							<div className={styles.otherActions}>
								<button
									type="button"
									onClick={handleGoogleSignUp}
									disabled={loading}
									className={styles.googleButton}
								>
									<svg className={styles.googleIcon} viewBox="0 0 24 24">
										<title>Google アイコン</title>
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

								<div className={styles.loginPrompt}>
									<span className={styles.loginPromptText}>
										すでにアカウントをお持ちですか？{" "}
										<Link href="/login" className={styles.loginLink}>
											ログイン
										</Link>
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout>
			<div className={styles.container}>
				<h1 className={styles.title}>新規登録</h1>

				<div className={styles.formCard}>
					{/* ステップインジケーター */}
					<div className={styles.stepContainer}>
						<div className={styles.stepInfo}>
							<div className={styles.stepHeader}>
								<span className={styles.stepText}>ステップ 2/4</span>
							</div>
							<div className={styles.progressContainer}>
								<div
									className={`${styles.progressBar} ${styles.progressStep2}`}
								/>
							</div>
						</div>
						<div className={styles.stepDots}>
							<div className={`${styles.stepDot} ${styles.stepDotActive}`} />
							<div className={`${styles.stepDot} ${styles.stepDotActive}`} />
							<div className={styles.stepDot} />
							<div className={styles.stepDot} />
						</div>
					</div>

					{error && <div className={styles.errorMessage}>{error}</div>}

					<div className={styles.contentsWrapper}>
						<form
							className={styles.form}
							onSubmit={usernameForm.handleSubmit(handleUsernameSubmit)}
						>
							<div className={styles.fieldGroup}>
								<div className={styles.inputContainer}>
									<label htmlFor={usernameId} className={styles.fieldLabel}>
										ユーザー名
									</label>
									<input
										{...usernameForm.register("username")}
										type="text"
										id={usernameId}
										className={`${styles.inputField} ${
											usernameForm.formState.errors.username ? styles.error : ""
										}`}
										placeholder="test_user"
									/>
								</div>
								{usernameForm.formState.errors.username && (
									<p className={styles.errorMessage}>
										{usernameForm.formState.errors.username.message}
									</p>
								)}
								<p className={styles.helpText}>
									※ ユーザー名は後から変更可能です
								</p>
							</div>

							<div className={styles.buttonContainer}>
								<button
									type="button"
									onClick={handleBack}
									className={`${styles.button} ${styles.secondaryButton}`}
								>
									戻る
								</button>
								<button
									type="submit"
									disabled={loading}
									className={`${styles.button} ${styles.primaryButton}`}
								>
									{loading ? "作成中..." : "次へ進む"}
								</button>
							</div>
						</form>

						<div className={styles.loginPrompt}>
							<span className={styles.loginPromptText}>
								すでにアカウントをお持ちですか？{" "}
								<Link href="/login" className={styles.loginLink}>
									ログイン
								</Link>
							</span>
						</div>
					</div>
				</div>
			</div>
		</AppLayout>
	);
}
