"use client";

import { useState, useEffect, type FC } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./ProfileEditClient.module.css";
import type { UserProfile } from "@/components/organisms/MyPageContent/MyPageContent";
import { Button } from "@/components/atoms/Button/Button";
import { usernameSchema } from "@/lib/utils/validation";
import { ZodError } from "zod";
import { EditIcon } from "@/components/atoms/icons/EditIcon";
import { TrashIcon } from "@/components/atoms/icons/TrashIcon";
import { Loader } from "@/components/atoms/Loader/Loader";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { getClientSupabase } from "@/lib/supabase/client";

interface ProfileEditClientProps {
	user: UserProfile;
}

// APIリクエストのベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export const ProfileEditClient: FC<ProfileEditClientProps> = ({
	user: initialUser,
}) => {
	const t = useTranslations();
	const router = useRouter();
	const { showToast } = useToast();
	const { refreshUser } = useAuth();
	const [user, setUser] = useState<UserProfile>(initialUser);
	const [loading, setLoading] = useState(true);

	const handleSave = async () => {
		// バリデーションチェック
		try {
			usernameSchema.parse({ username: formData.username });
		} catch (error) {
			if (error instanceof ZodError) {
				setUsernameError(error.errors[0]?.message || t("profileEdit.invalidUsername"));
				return;
			}
		}

		try {
			let updatedProfileImageUrl = formData.profile_image_url;

			// 画像アップロード処理
			if (profileImageFile) {
				updatedProfileImageUrl = await uploadImageToS3(profileImageFile);
			}

			const updatedData = {
				username: formData.username,
				dojo_style_name: formData.dojo_style_name || null,
				training_start_date: formData.training_start_date || null,
				profile_image_url: updatedProfileImageUrl || null,
			};

			// JWTトークンを取得
			const tokenResponse = await fetch("/api/auth/token", {
				method: "POST",
			});

			if (!tokenResponse.ok) {
				throw new Error(t("profileEdit.authTokenFailed"));
			}

			const tokenData = await tokenResponse.json();
			const token = tokenData.data.token;

			// HonoAPIを呼び出し
			const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(updatedData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || t("profileEdit.communicationFailed"));
			}

			const result = await response.json();
			console.log("✅ [DEBUG] ProfileEdit: プロフィール更新成功:", result);

			// ユーザー情報を再取得してセッションを更新
			console.log("🔄 [DEBUG] ProfileEdit: refreshUser()を呼び出し開始");
			const refreshedUser = await refreshUser();
			console.log("🔄 [DEBUG] ProfileEdit: refreshUser()完了", {
				refreshedUser,
			});

			showToast(t("profileEdit.updateSuccess"), "success");

			router.push("/mypage");
		} catch (error) {
			console.error("プロフィール更新エラー:", error);
			showToast(
				error instanceof Error ? error.message : t("profileEdit.communicationFailed"),
				"error",
			);
		}
	};

	const handleCancel = () => {
		// プレビューURLをクリーンアップ
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		router.push("/mypage");
	};

	const [formData, setFormData] = useState({
		username: user.username,
		dojo_style_name: user.dojo_style_name || "",
		training_start_date: user.training_start_date || "",
		profile_image_url: user.profile_image_url || "",
	});

	const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [usernameError, setUsernameError] = useState<string | null>(null);

	// 画像アップロード用のヘルパー関数
	const uploadImageToS3 = async (file: File): Promise<string> => {
		// ステップ1: 署名付きURLを取得
		const uploadUrlResponse = await fetch("/api/upload-url", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				filename: file.name,
				contentType: file.type,
				fileSize: file.size,
			}),
		});

		if (!uploadUrlResponse.ok) {
			const errorData = await uploadUrlResponse.json();
			throw new Error(errorData.error || t("profileEdit.uploadUrlFailed"));
		}

		const { uploadUrl, fileKey } = await uploadUrlResponse.json();

		// ステップ2: S3にファイルをアップロード
		const uploadResponse = await fetch(uploadUrl, {
			method: "PUT",
			headers: {
				"Content-Type": file.type,
			},
			body: file,
		});

		if (!uploadResponse.ok) {
			throw new Error(t("profileEdit.s3UploadFailed"));
		}

		// ステップ3: プロフィール画像URLを更新
		const updateResponse = await fetch("/api/profile-image", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fileKey,
			}),
		});

		if (!updateResponse.ok) {
			const errorData = await updateResponse.json();
			throw new Error(
				errorData.error || t("profileEdit.profileImageUpdateFailed"),
			);
		}

		const { imageUrl } = await updateResponse.json();
		return imageUrl;
	};

	// 最新のプロフィール情報を取得
	const fetchUserProfile = async () => {
		try {
			// JWTトークンを取得
			const tokenResponse = await fetch("/api/auth/token", {
				method: "POST",
			});

			if (!tokenResponse.ok) {
				throw new Error(t("profileEdit.authTokenFailed"));
			}

			const tokenData = await tokenResponse.json();
			const token = tokenData.data.token;

			// Hono APIからプロフィール取得
			const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || t("profileEdit.profileFetchFailed"));
			}

			const result = await response.json();
			const latestUser = result.data;

			// ユーザー情報とフォームデータを更新
			setUser(latestUser);
			setFormData({
				username: latestUser.username,
				dojo_style_name: latestUser.dojo_style_name || "",
				training_start_date: latestUser.training_start_date || "",
				profile_image_url: latestUser.profile_image_url || "",
			});
		} catch (error) {
			console.error("プロフィール取得エラー:", error);
			showToast(t("profileEdit.profileFetchFailed"), "error");
		} finally {
			setLoading(false);
		}
	};

	// コンポーネントマウント時に最新プロフィールを取得
	useEffect(() => {
		fetchUserProfile();
	}, []);

	// フォームデータの初期化（userが更新された時）
	useEffect(() => {
		setFormData({
			username: user.username,
			dojo_style_name: user.dojo_style_name || "",
			training_start_date: user.training_start_date || "",
			profile_image_url: user.profile_image_url || "",
		});
	}, [user]);

	const handleInputChange =
		(field: keyof typeof formData) =>
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const value = event.target.value;
			setFormData((prev) => ({
				...prev,
				[field]: value,
			}));

			// ユーザー名のバリデーション
			if (field === "username") {
				try {
					usernameSchema.parse({ username: value });
					setUsernameError(null);
				} catch (error) {
					if (error instanceof ZodError) {
						setUsernameError(
							error.errors[0]?.message || t("profileEdit.invalidUsername"),
						);
					}
				}
			}
		};

	const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setProfileImageFile(file);
			const url = URL.createObjectURL(file);
			setPreviewUrl(url);
		}
	};

	const handleDeleteImage = () => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		setProfileImageFile(null);
		setPreviewUrl(null);
	};

	const currentImageUrl = previewUrl || user.profile_image_url;

	// ローディング中の表示
	if (loading) {
		return (
			<div className={styles.content}>
				<Loader size="medium" centered text={t("profileEdit.loading")} />
			</div>
		);
	}

	return (
		<>
			<div className={styles.content}>
				<div className={styles.imageSection}>
					<label className={styles.profileImageContainer}>
						<div className={styles.profileImage}>
							{currentImageUrl ? (
								<img
									src={currentImageUrl}
									alt={t("profileEdit.profileImageAlt")}
									style={{ width: "100%", height: "100%", objectFit: "cover" }}
								/>
							) : (
								<svg width="48" height="48" viewBox="0 0 24 24" fill="#9ca3af">
									<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
								</svg>
							)}
						</div>
						<div className={styles.editIcon}>
							<input
								type="file"
								accept="image/*"
								onChange={handleImageChange}
								className={styles.fileInput}
							/>
							<EditIcon size={16} color="#6b7280" />
						</div>
					</label>
					<div className={styles.imageUpload}>
						<p className={styles.uploadText}>
							{t("profileEdit.uploadInstructions").split('\n').map((line, index) => (
								<span key={index}>
									{line}
									{index === 0 && <br />}
								</span>
							))}
						</p>
						<div className={styles.fileInfoContainer}>
							<p
								className={styles.fileInfo}
								style={{
									color: profileImageFile ? "#000" : "#6b7280",
								}}
							>
								{profileImageFile
									? profileImageFile.name
									: t("profileEdit.noFileUploaded")}
							</p>
							<button
								className={styles.deleteButton}
								type="button"
								onClick={handleDeleteImage}
								disabled={!profileImageFile}
								style={{
									opacity: profileImageFile ? 1 : 0.5,
									cursor: profileImageFile ? "pointer" : "not-allowed",
								}}
							>
								<TrashIcon size={16} color="#6b7280" />
							</button>
						</div>
					</div>
				</div>

				<div className={styles.formSection}>
					<div className={styles.formGroup}>
						<label htmlFor="username" className={styles.label}>
							{t("profileEdit.username")}
							<span className={styles.required}>{t("profileEdit.required")}</span>
						</label>
						<input
							type="text"
							id="username"
							value={formData.username}
							onChange={handleInputChange("username")}
							className={`${styles.inputField} ${usernameError ? styles.error : ""}`}
							placeholder={t("profileEdit.usernamePlaceholder")}
							maxLength={20}
						/>
						{usernameError && (
							<div
								style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}
							>
								{usernameError}
							</div>
						)}
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="dojo_style_name" className={styles.label}>
							{t("profileEdit.currentDojo")}
						</label>
						<input
							type="text"
							id="dojo_style_name"
							value={formData.dojo_style_name}
							onChange={handleInputChange("dojo_style_name")}
							placeholder={t("profileEdit.dojoPlaceholder")}
							className={styles.inputField}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="training_start_date" className={styles.label}>
							{t("profileEdit.trainingStartDate")}
						</label>
						<input
							type="text"
							id="training_start_date"
							value={formData.training_start_date}
							onChange={handleInputChange("training_start_date")}
							placeholder={t("profileEdit.trainingStartPlaceholder")}
							className={styles.inputField}
						/>
					</div>
				</div>
			</div>
			<div className={styles.actions}>
				<Button variant="secondary" onClick={handleCancel}>
					{t("profileEdit.cancel")}
				</Button>
				<Button variant="primary" onClick={handleSave}>
					{t("profileEdit.save")}
				</Button>
			</div>
		</>
	);
};
