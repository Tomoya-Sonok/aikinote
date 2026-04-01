import Link from "next/link";
import type { FC, ReactNode } from "react";
import { AikinoteRightArrow } from "@/components/shared/Icons/AikinoteRightArrow";
import styles from "./CtaButton.module.css";

interface CtaButtonProps {
  variant: "primary" | "secondary";
  size?: "large" | "compact";
  href: string;
  external?: boolean;
  onClick?: () => void;
  trackEvent?: string;
  className?: string;
  children: ReactNode;
}

export const CtaButton: FC<CtaButtonProps> = ({
  variant,
  size = "large",
  href,
  external = false,
  onClick,
  trackEvent,
  className,
  children,
}) => {
  const iconSize = size === "compact" ? 12 : 14;

  const buttonClass = [styles.base, styles[size], styles[variant], className]
    .filter(Boolean)
    .join(" ");

  const iconClass = [
    styles.icon,
    variant === "primary"
      ? size === "compact"
        ? styles.primaryIconCompact
        : styles.primaryIconLarge
      : size === "compact"
        ? styles.secondaryIconCompact
        : styles.secondaryIconLarge,
  ].join(" ");

  const content = (
    <>
      <span>{children}</span>
      <span className={iconClass}>
        <AikinoteRightArrow size={iconSize} />
      </span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={buttonClass}
        onClick={onClick}
        data-umami-event={trackEvent}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={buttonClass}
      onClick={onClick}
      data-umami-event={trackEvent}
    >
      {content}
    </Link>
  );
};
