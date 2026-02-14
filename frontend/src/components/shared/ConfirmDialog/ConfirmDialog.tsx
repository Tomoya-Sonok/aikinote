"use client";

import { type KeyboardEvent, useEffect, useId, useRef } from "react";
import { Button } from "@/components/shared/Button/Button";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isProcessing) {
      onCancel();
    }
  };

  const handleBackdropClick = () => {
    if (!isProcessing) {
      onCancel();
    }
  };

  return (
    <div className={styles.overlay} role="presentation">
      <button
        type="button"
        className={styles.overlayDismiss}
        onClick={handleBackdropClick}
        aria-label={cancelLabel}
        disabled={isProcessing}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        <p className={styles.message} id={descriptionId}>
          {message}
        </p>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="medium"
            onClick={onCancel}
            disabled={isProcessing}
            className={styles.button}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant="danger"
            size="medium"
            onClick={onConfirm}
            disabled={isProcessing}
            className={styles.button}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
