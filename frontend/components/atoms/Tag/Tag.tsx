import type { FC, ReactNode } from "react";
import styles from "./Tag.module.css";

interface TagProps {
	children: ReactNode;
	variant?: "default" | "selected";
	onClick?: () => void;
}

export const Tag: FC<TagProps> = ({
	children,
	variant = "default",
	onClick,
}) => {
	if (onClick) {
		return (
			<button
				type="button"
				className={`${styles.tag} ${styles[variant]} ${styles.clickable}`}
				onClick={onClick}
			>
				{children}
			</button>
		);
	}

	return <div className={`${styles.tag} ${styles[variant]}`}>{children}</div>;
};
