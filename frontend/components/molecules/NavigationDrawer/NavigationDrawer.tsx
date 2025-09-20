"use client";

import type { FC } from "react";
import { useEffect } from "react";
import { SettingItem } from "@/components/atoms/SettingItem/SettingItem";
import styles from "./NavigationDrawer.module.css";

interface NavigationDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	onEmailClick: () => void;
	onTextSizeClick: () => void;
	onLanguageClick: () => void;
}

export const NavigationDrawer: FC<NavigationDrawerProps> = ({
	isOpen,
	onClose,
	onEmailClick,
	onTextSizeClick,
	onLanguageClick,
}) => {
	// ESCキーでドロワーを閉じる
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			// スクロールを無効化
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<>
			{/* オーバーレイ */}
			<div className={styles.overlay} onClick={onClose} />

			{/* ドロワー本体 */}
			<div className={`${styles.drawer} ${isOpen ? styles.open : ""}`}>
				<div className={styles.header}>
					<h2 className={styles.title}>設定</h2>
					<button
						type="button"
						onClick={onClose}
						className={styles.closeButton}
						aria-label="設定を閉じる"
					>
						×
					</button>
				</div>

				<div className={styles.content}>
					<div className={styles.menu}>
						<SettingItem onClick={onEmailClick}>メール</SettingItem>
						<SettingItem onClick={onTextSizeClick}>文字サイズ</SettingItem>
						<SettingItem onClick={onLanguageClick}>言語 / Language</SettingItem>
					</div>
				</div>
			</div>
		</>
	);
};