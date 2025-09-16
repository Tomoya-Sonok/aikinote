"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import styles from "./Toast.module.css";

interface ToastProps {
	message: string;
	type?: "success" | "error" | "info";
	duration?: number;
	onClose: () => void;
}

export const Toast: FC<ToastProps> = ({
	message,
	type = "info",
	duration = 3000,
	onClose,
}) => {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		setIsVisible(true);
		const timer = setTimeout(() => {
			setIsVisible(false);
			setTimeout(onClose, 300);
		}, duration);

		return () => clearTimeout(timer);
	}, [duration, onClose]);

	return (
		<div className={`${styles.toast} ${styles[type]} ${isVisible ? styles.visible : ""}`}>
			{message}
		</div>
	);
};