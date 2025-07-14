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
			<div className={styles.circle}>
				<Image
					src="/icons/file-edit-icon.svg"
					alt="新規作成"
					width={26}
					height={27}
					className={styles.icon}
				/>
			</div>
			<span className={styles.label}>{label}</span>
		</button>
	);
};
