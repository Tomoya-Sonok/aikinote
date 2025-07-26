import type { FC } from "react";
import Image from "next/image";
import styles from "./FloatingActionButton.module.css";

interface FloatingActionButtonProps {
	onClick: () => void;
	label?: string;
}

export const FloatingActionButton: FC<FloatingActionButtonProps> = ({
	onClick,
	label = "ページ作成",
}) => {
	return (
		<button className={styles.fab} onClick={onClick} type="button">
			<Image
				src="/icons/file-edit-icon-new.svg"
				alt="新規作成"
				width={32}
				height={33}
				className={styles.icon}
			/>
			<span className={styles.label}>{label}</span>
		</button>
	);
};
