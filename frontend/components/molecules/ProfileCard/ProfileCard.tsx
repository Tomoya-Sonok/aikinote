import type { FC } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { ProfileImage } from "@/components/atoms/ProfileImage/ProfileImage";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
	username: string;
	dojoStyleName?: string;
	trainingStartDate?: string;
	profileImageUrl?: string | null;
	onEditClick: () => void;
}

export const ProfileCard: FC<ProfileCardProps> = ({
	username,
	dojoStyleName = "未入力",
	trainingStartDate = "未入力",
	profileImageUrl,
	onEditClick,
}) => {
	return (
		<div>
			<div className={styles.profileSection}>
				<ProfileImage
					src={profileImageUrl}
					size="small"
					alt={`${username}のプロフィール画像`}
				/>
				<div
					className={
						username.length > 10 ? styles.userInfo : styles.userInfoShort
					}
				>
					<h1 className={styles.username}>{username}</h1>
					<Button variant="primary" size="small" onClick={onEditClick}>
						編集する
					</Button>
				</div>
			</div>

			<div className={styles.detailsSection}>
				<div className={styles.detail}>
					<span className={styles.label}>現在所属している道場（流派）</span>
					<span className={styles.value}>{dojoStyleName}</span>
				</div>

				<div className={styles.detail}>
					<span className={styles.label}>合気道を始めたのはいつ？</span>
					<span className={styles.value}>{trainingStartDate}</span>
				</div>
			</div>
		</div>
	);
};
