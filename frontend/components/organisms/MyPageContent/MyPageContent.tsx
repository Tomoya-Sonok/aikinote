"use client";

import type { FC } from "react";
import { useState } from "react";
import { MenuSection } from "@/components/atoms/MenuSection/MenuSection";
import { OtherMenu } from "@/components/molecules/OtherMenu/OtherMenu";
import { ProfileCard } from "@/components/molecules/ProfileCard/ProfileCard";
import { SettingsMenu } from "@/components/molecules/SettingsMenu/SettingsMenu";
import { ProfileEdit } from "@/components/organisms/ProfileEdit/ProfileEdit";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./MyPageContent.module.css";

export interface UserProfile {
	id: string;
	username: string;
	email: string;
	profile_image_url?: string | null;
	dojo_id?: string | null;
	training_start_date?: string | null;
	publicity_setting?: string;
	language?: string;
	is_email_verified?: boolean;
	password_hash?: string;
}

interface MyPageContentProps {
	user: UserProfile;
	className?: string;
}

export const MyPageContent: FC<MyPageContentProps> = ({
	user,
	className = "",
}) => {
	const { signOutUser } = useAuth();
	const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
	const [currentUser, setCurrentUser] = useState(user);

	const handleEditProfile = () => {
		setIsProfileEditOpen(true);
	};

	const handleLogout = async () => {
		try {
			console.log("ログアウト処理を開始します");
			await signOutUser();
			console.log("ログアウト処理完了");
		} catch (error) {
			console.error("ログアウトエラー:", error);
			// エラーが発生した場合もユーザーに分かるようにアラートを表示
			alert("ログアウトに失敗しました。再度お試しください。");
		}
	};

	const handleSettingClick = (settingType: string) => {
		console.log(`${settingType}がクリックされました`);
	};

	const handleCloseProfileEdit = () => {
		setIsProfileEditOpen(false);
	};

	const handleSaveProfile = async (updatedUser: Partial<UserProfile>) => {
		try {
			// TODO: API呼び出しでプロフィールを更新
			console.log("プロフィール更新データ:", updatedUser);

			// 一時的にローカル状態を更新
			setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
			setIsProfileEditOpen(false);

			// 実際の実装では、ここでAPIを呼び出してサーバーサイドでデータを更新します
		} catch (error) {
			console.error("プロフィール更新エラー:", error);
		}
	};

	// プロフィール編集モードの場合は、ProfileEditコンポーネントのみを表示
	if (isProfileEditOpen) {
		return (
			<ProfileEdit
				user={currentUser}
				onSave={handleSaveProfile}
				onCancel={handleCloseProfileEdit}
				className={className}
			/>
		);
	}

	return (
		<div className={`${styles.content} ${className}`}>
			<MenuSection title="プロフィール">
				<ProfileCard
					username={currentUser.username}
					trainingDescription={currentUser.dojo_id || "未設定"}
					trainingStartDate={currentUser.training_start_date || "未設定"}
					profileImageUrl={currentUser.profile_image_url}
					onEditClick={handleEditProfile}
				/>
			</MenuSection>

			<MenuSection title="設定">
				<SettingsMenu
					onPublicityClick={() => handleSettingClick("公開範囲")}
					onEmailClick={() => handleSettingClick("メール")}
					onTextSizeClick={() => handleSettingClick("文字サイズ")}
					onLanguageClick={() => handleSettingClick("言語")}
				/>
			</MenuSection>

			<MenuSection title="その他">
				<OtherMenu
					onHelpClick={() => handleSettingClick("ヘルプ")}
					onLogoutClick={handleLogout}
				/>
			</MenuSection>
		</div>
	);
};
