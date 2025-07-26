import type { FC, ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps {
	children: ReactNode;
	variant?: "primary" | "secondary" | "icon";
	size?: "small" | "medium" | "large";
	onClick?: () => void;
	disabled?: boolean;
	className?: string;
}

export const Button: FC<ButtonProps> = ({
	children,
	variant = "primary",
	size = "medium",
	onClick,
	disabled = false,
	className = "",
}) => {
	return (
		<button
			type="button"
			className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</button>
	);
};
