"use client";

import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";
import { useState } from "react";
import { NavigationDrawer } from "@/components/molecules/NavigationDrawer";
import type { UserSession } from "@/lib/auth";
import styles from "./DefaultHeader.module.css";

interface DefaultHeaderProps {
	user: UserSession | null;
	showUserSection?: boolean;
	showSettings?: boolean;
	settingsHref?: string;
}

const FALLBACK_AVATAR_LABEL = "?";

export const DefaultHeader: FC<DefaultHeaderProps> = ({
	user,
	showUserSection = true,
	showSettings = true,
	settingsHref = "/settings",
}) => {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const avatarLabel =
		user?.username?.[0]?.toUpperCase() ?? FALLBACK_AVATAR_LABEL;

	const handleSettingsClick = () => {
		setIsDrawerOpen(true);
	};

	const handleCloseDrawer = () => {
		setIsDrawerOpen(false);
	};

	const handleTextSizeClick = () => {
		setIsDrawerOpen(false);
		window.location.href = "/settings/font-size";
	};

	const handleEmailClick = () => {
		setIsDrawerOpen(false);
		console.log("メール設定がクリックされました");
	};

	const handleLanguageClick = () => {
		setIsDrawerOpen(false);
		console.log("言語設定がクリックされました");
	};

	return (
		<header className={styles.header}>
			<Link href="/" className={styles.logoLink} aria-label="ホームに移動">
				<Image
					src="/images/aikinote-logo.png"
					alt="AikiNote"
					width={56}
					height={56}
					priority
					className={styles.logo}
				/>
			</Link>

			<div className={styles.headerRight}>
				{showUserSection && user && (
					<div className={styles.userSection}>
						{user.profile_image_url ? (
							<Image
								src={user.profile_image_url}
								alt={`${user.username}のアイコン`}
								width={40}
								height={40}
								className={styles.avatarImage}
								unoptimized
							/>
						) : (
							<div className={styles.avatarFallback} aria-hidden="true">
								{avatarLabel}
							</div>
						)}
						<div className={styles.userInfo}>
							<span className={styles.userName}>
								{user.username}
							</span>
							{user.dojo_style_name && (
								<span className={styles.userDojoStyleName}>
									{user.dojo_style_name}
								</span>
							)}
						</div>
					</div>
				)}

				{showSettings && (
					<button
						type="button"
						onClick={handleSettingsClick}
						className={styles.settingsButton}
						aria-label="設定を開く"
					>
						<Image
							src="/icons/settings-icon.svg"
							alt="設定"
							width={20}
							height={20}
							className={styles.settingsIcon}
						/>
					</button>
				)}
			</div>

			<NavigationDrawer
				isOpen={isDrawerOpen}
				onClose={handleCloseDrawer}
				onEmailClick={handleEmailClick}
				onTextSizeClick={handleTextSizeClick}
				onLanguageClick={handleLanguageClick}
			/>
		</header>
	);
};
