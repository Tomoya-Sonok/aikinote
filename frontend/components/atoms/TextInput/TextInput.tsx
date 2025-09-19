import type { InputHTMLAttributes } from "react";
import { forwardRef, useId } from "react";
import styles from "./TextInput.module.css";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	required?: boolean;
	error?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
	({ label, required = false, error, className, ...props }, ref) => {
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
				<input
					ref={ref}
					id={inputId}
					className={`${styles.input} ${error ? styles.error : ""}`}
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
	},
);

TextInput.displayName = "TextInput";
