import type { FC, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import styles from "./TextArea.module.css";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string;
	required?: boolean;
	error?: string;
}

export const TextArea: FC<TextAreaProps> = ({
	label,
	required = false,
	error,
	className,
	...props
}) => {
	const inputId = useId();
	const errorId = useId();

	return (
		<div className={`${styles.container} ${className || ""}`}>
			{label && (
				<label htmlFor={inputId} className={styles.label}>
					{label}
					{required && <span className={styles.required}>必須</span>}
				</label>
			)}
			<textarea
				id={inputId}
				className={`${styles.textarea} ${error ? styles.error : ""}`}
				aria-describedby={error ? errorId : undefined}
				{...props}
			/>
			{error && (
				<span id={errorId} className={styles.errorMessage}>
					{error}
				</span>
			)}
		</div>
	);
};
