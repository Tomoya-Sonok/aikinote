"use client";

import { useState, useEffect, type FC } from "react";
import { useRouter } from "next/navigation";
import styles from "./ProfileEditClient.module.css";
import type { UserProfile } from "@/components/organisms/MyPageContent/MyPageContent";
import { Button } from "@/components/atoms/Button/Button";
import { usernameSchema } from "@/lib/utils/validation";
import { ZodError } from "zod";
import { EditIcon } from "@/components/atoms/icons/EditIcon";
import { TrashIcon } from "@/components/atoms/icons/TrashIcon";
import { Loader } from "@/components/atoms/Loader/Loader";
import { useToast } from "@/contexts/ToastContext";

interface ProfileEditClientProps {
	user: UserProfile;
}

// APIリクエストのベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export const ProfileEditClient: FC<ProfileEditClientProps> = ({ user: initialUser }) => {
	const router = useRouter();
	const { showToast } = useToast();
	const [user, setUser] = useState<UserProfile>(initialUser);
	const [loading, setLoading] = useState(true);

	const handleSave = async () => {
		// バリデーションチェック
		try {
			usernameSchema.parse({ username: formData.username });
		} catch (error) {
			if (error instanceof ZodError) {
				setUsernameError(error.errors[0]?.message || "無効なユーザー名です");
				return;
			}
		}

		const updatedData = {
			username: formData.username,
			dojo_style_name: formData.dojo_style_name || null,
			training_start_date: formData.training_start_date || null,
		};

		// TODO: 画像アップロード処理を実装
		if (profileImageFile) {
			console.log("画像ファイル:", profileImageFile);
		}

		try {
			// JWTトークンを取得
			const tokenResponse = await fetch("/api/auth/token", {
				method: "POST",
			});

			if (!tokenResponse.ok) {
				throw new Error("認証トークンの取得に失敗しました");
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
				throw new Error(errorData.error || "通信に失敗しました");
			}

			const result = await response.json();
			console.log("プロフィール更新成功:", result);

			showToast("プロフィールを更新しました", "success");
			router.push("/mypage");
		} catch (error) {
			console.error("プロフィール更新エラー:", error);
			showToast("通信に失敗しました", "error");
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
	});

	const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [usernameError, setUsernameError] = useState<string | null>(null);

	// 最新のプロフィール情報を取得
	const fetchUserProfile = async () => {
		try {
			// JWTトークンを取得
			const tokenResponse = await fetch("/api/auth/token", {
				method: "POST",
			});

			if (!tokenResponse.ok) {
				throw new Error("認証トークンの取得に失敗しました");
			}

			const tokenData = await tokenResponse.json();
			const token = tokenData.data.token;

			// Hono APIからプロフィール取得
			const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
				method: "GET",
				headers: {
					"Authorization": `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || "プロフィールの取得に失敗しました");
			}

			const result = await response.json();
			const latestUser = result.data;

			// ユーザー情報とフォームデータを更新
			setUser(latestUser);
			setFormData({
				username: latestUser.username,
				dojo_style_name: latestUser.dojo_style_name || "",
				training_start_date: latestUser.training_start_date || "",
			});
		} catch (error) {
			console.error("プロフィール取得エラー:", error);
			showToast("プロフィールの取得に失敗しました", "error");
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
							error.errors[0]?.message || "無効なユーザー名です",
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
				<Loader size="medium" centered text="プロフィール情報を読み込み中..." />
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
									alt="プロフィール画像"
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
							画像をアップロードするには
							<br />
							左のアイコンを押下してください。
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
									: "ファイルがアップロードされていません"}
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
							ユーザー名
							<span className={styles.required}>必須</span>
						</label>
						<input
							type="text"
							id="username"
							value={formData.username}
							onChange={handleInputChange("username")}
							className={`${styles.inputField} ${usernameError ? styles.error : ""}`}
							placeholder="未設定"
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
							現在所属している道場（流派）は？
						</label>
						<input
							type="text"
							id="dojo_style_name"
							value={formData.dojo_style_name}
							onChange={handleInputChange("dojo_style_name")}
							placeholder="合気会 / 養神館 / 心身統一合気道 など"
							className={styles.inputField}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="training_start_date" className={styles.label}>
							合気道を始めたのはいつ頃？
						</label>
						<input
							type="text"
							id="training_start_date"
							value={formData.training_start_date}
							onChange={handleInputChange("training_start_date")}
							placeholder="2020年ごろ / 約5年前 など"
							className={styles.inputField}
						/>
					</div>
				</div>
			</div>
			<div className={styles.actions}>
				<Button variant="secondary" onClick={handleCancel}>
					キャンセル
				</Button>
				<Button variant="primary" onClick={handleSave}>
					保存する
				</Button>
			</div>
		</>
	);
};
