import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "icon" | "danger";
  size?: "small" | "medium" | "large";
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "medium",
      type = "button",
      className = "",
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
