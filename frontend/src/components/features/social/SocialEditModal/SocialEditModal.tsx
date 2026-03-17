"use client";

import { useTranslations } from "next-intl";
import { type FC, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AttachmentData } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import { Button } from "@/components/shared/Button/Button";
import { HashtagTextarea } from "@/components/shared/HashtagTextarea/HashtagTextarea";
import { useToast } from "@/contexts/ToastContext";
import { updateSocialPost } from "@/lib/api/client";
import styles from "./SocialEditModal.module.css";

const MAX_CONTENT_LENGTH = 2000;

interface SocialEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  postId: string;
  initialContent: string;
  initialAttachments: AttachmentData[];
}

export const SocialEditModal: FC<SocialEditModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  postId,
  initialContent,
  initialAttachments,
}) => {
  const t = useTranslations("socialPosts");
  const { showToast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [attachments, setAttachments] =
    useState<AttachmentData[]>(initialAttachments);
  const [isSaving, setIsSaving] = useState(false);

  // モーダルが開くたびに初期値をリセット
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setAttachments(initialAttachments);
    }
  }, [isOpen, initialContent, initialAttachments]);

  const handleAttachmentAdd = useCallback((attachment: AttachmentData) => {
    setAttachments((prev) => [...prev, attachment]);
  }, []);

  const handleAttachmentDelete = useCallback(async (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));

    // DB保存済み添付（temp- で始まらない）は API で削除
    if (!id.startsWith("temp-")) {
      try {
        await fetch(`/api/social-post-attachments?id=${id}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn("添付の削除に失敗:", err);
      }
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    try {
      // コンテンツの更新
      await updateSocialPost({
        postId,
        content: content.trim(),
      });

      // 新規追加された添付（temp- IDのもの）を保存
      const newAttachments = attachments.filter((a) =>
        a.id.startsWith("temp-"),
      );
      for (const attachment of newAttachments) {
        try {
          // biome-ignore lint/suspicious/noExplicitAny: _fileKey は内部拡張プロパティ
          const fileKey = (attachment as any)._fileKey as string | undefined;

          const payload: Record<string, unknown> = {
            post_id: postId,
            type: attachment.type,
            original_filename: attachment.original_filename ?? null,
            file_size_bytes: attachment.file_size_bytes ?? null,
            thumbnail_url: attachment.thumbnail_url ?? null,
          };

          if (attachment.type === "youtube") {
            payload.url = attachment.url;
          } else {
            payload.file_key = fileKey;
          }

          await fetch("/api/social-post-attachments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          console.warn("添付メタデータの保存に失敗:", err);
        }
      }

      showToast(t("editSuccess"), "success");
      onUpdate();
      onClose();
    } catch {
      showToast(t("editFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  }, [content, attachments, isSaving, postId, showToast, t, onUpdate, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("editModalTitle")}</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <HashtagTextarea
              value={content}
              onChange={(e) =>
                setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))
              }
              rows={6}
              maxLength={MAX_CONTENT_LENGTH}
            />
            <span className={styles.charCount}>
              {t("charCount", { count: content.length })}
            </span>
          </div>

          <div className={styles.section}>
            <AttachmentUpload
              attachments={attachments}
              onAttachmentAdd={handleAttachmentAdd}
              onAttachmentDelete={handleAttachmentDelete}
              uploadType="social-post-attachment"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <Button size="medium" onClick={onClose}>
            {t("editCancel")}
          </Button>
          <Button
            variant="primary"
            size="medium"
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
          >
            {isSaving ? "..." : t("editSave")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
