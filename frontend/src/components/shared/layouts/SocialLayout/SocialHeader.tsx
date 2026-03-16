import { ArrowLeftIcon } from "@phosphor-icons/react";
import { memo, type ReactNode } from "react";
import { Button } from "@/components/shared/Button/Button";
import styles from "./SocialHeader.module.css";

interface SocialHeaderProps {
  /** Full override - renders children directly inside <header> */
  children?: ReactNode;
  /** Page title (ignored if children or center provided) */
  title?: string;
  /** Custom center slot (ignored if children provided) */
  center?: ReactNode;
  /** Back button handler (renders back button when provided) */
  onBack?: () => void;
  /** Accessible label for back button */
  backLabel?: string;
  /** Right slot content */
  right?: ReactNode;
}

export const SocialHeader = memo(function SocialHeader({
  children,
  title,
  center,
  onBack,
  backLabel,
  right,
}: SocialHeaderProps) {
  if (children) {
    return <header className={styles.header}>{children}</header>;
  }

  return (
    <header className={styles.header}>
      {onBack ? (
        <Button
          className={styles.backButton}
          onClick={onBack}
          aria-label={backLabel}
        >
          <ArrowLeftIcon size={24} weight="regular" />
        </Button>
      ) : (
        <div className={styles.headerSpacer} />
      )}
      {center || (title && <h1 className={styles.headerTitle}>{title}</h1>)}
      {right || <div className={styles.headerSpacer} />}
    </header>
  );
});
