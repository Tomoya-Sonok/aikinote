"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./ScrollIndicator.module.css";

interface ScrollIndicatorProps {
	label: string;
}

export function ScrollIndicator({ label }: ScrollIndicatorProps) {
	const [isHidden, setIsHidden] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const footer = document.querySelector("[data-scroll-footer]");
		if (!footer) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsHidden(entry.isIntersecting);
			},
			{
				root: null,
				threshold: 0.05,
				rootMargin: "0px 0px -8px 0px",
			},
		);

		observer.observe(footer);

		return () => {
			observer.disconnect();
		};
	}, []);

	const handleClick = useCallback(() => {
		if (typeof window === "undefined") return;
		const offset = window.innerHeight * 0.75;
		window.scrollBy({
			top: offset,
			left: 0,
			behavior: "smooth",
		});
	}, []);

	const className = useMemo(
		() =>
			isHidden
				? `${styles.scrollIndicator} ${styles.hidden}`
				: styles.scrollIndicator,
		[isHidden],
	);

	return (
		<button
			type="button"
			className={className}
			onClick={handleClick}
			aria-label={label}
		>
			<span className={styles.chevrons} aria-hidden="true">
				<span className={styles.chevron} />
				<span className={styles.chevron} />
				<span className={styles.chevron} />
			</span>
			<span className={styles.label}>{label}</span>
		</button>
	);
}
