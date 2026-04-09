"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { HashtagTextarea } from "@/components/shared/HashtagTextarea/HashtagTextarea";
import { Loader } from "@/components/shared/Loader/Loader";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout/SocialHeader";
import { useToast } from "@/contexts/ToastContext";
import { getSocialPost, updateSocialPost } from "@/lib/api/client";
import { useAttachmentManagement } from "@/lib/hooks/useAttachmentManagement";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { useRouter } from "@/lib/i18n/routing";
import styles from "./SocialPostEdit.module.css";

const MAX_CONTENT_LENGTH = 2000;

export function SocialPostEdit() {
  const t = useTranslations("socialPosts");
  const router = useRouter();
  const tCommon = useTranslations();
  const { showToast } = useToast();
  const params = useParams();
  const postId = params.post_id as string;

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);

  const attachmentMgmt = useAttachmentManagement("social-post");
  const initialAttachmentCountRef = useRef(0);

  // 投稿データを取得
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const result = await getSocialPost(postId);
        if (result.success && result.data) {
          const postData = result.data as {
            post: { content: string };
            attachments: Array<{
              id: string;
              type: string;
              url: string;
              thumbnail_url?: string | null;
              original_filename?: string | null;
            }>;
          };
          setContent(postData.post.content);
          setInitialContent(postData.post.content);
          const atts = postData.attachments.map((a) => ({
            id: a.id,
            type: a.type as "image" | "video" | "youtube",
            url: a.url,
            thumbnail_url: a.thumbnail_url,
            original_filename: a.original_filename,
          }));
          attachmentMgmt.setAttachments(atts);
          initialAttachmentCountRef.current = atts.length;
        }
      } catch {
        showToast(t("editFailed"), "error");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId, showToast, t, attachmentMgmt.setAttachments]);

  // 未保存データの保護
  const hasUnsavedChanges = useCallback(() => {
    return (
      content.trim() !== initialContent.trim() ||
      attachmentMgmt.attachments.length !== initialAttachmentCountRef.current
    );
  }, [content, initialContent, attachmentMgmt.attachments.length]);

  const isNavigatingRef = useRef(false);
  useBeforeUnload(() => !isNavigatingRef.current && hasUnsavedChanges());

  const handleSave = useCallback(async () => {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const result = await updateSocialPost({
        postId,
        content: content.trim(),
      });

      // 新規追加された添付を保存
      await attachmentMgmt.saveNewAttachments(postId);

      if (result.success && result.warning) {
        showToast(result.warning, "error");
      }

      isNavigatingRef.current = true;
      router.replace(`/social/posts/${postId}`);
    } catch {
      showToast(t("editFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  }, [content, isSaving, postId, showToast, t, router, attachmentMgmt]);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      setIsBackConfirmOpen(true);
    } else {
      isNavigatingRef.current = true;
      router.replace(`/social/posts/${postId}`);
    }
  }, [hasUnsavedChanges, router, postId]);

  const handleConfirmBack = useCallback(() => {
    setIsBackConfirmOpen(false);
    router.replace(`/social/posts/${postId}`);
  }, [router, postId]);

  if (loading) {
    return (
      <div className={styles.layout}>
        <SocialHeader
          title={t("editModalTitle")}
          onBack={handleBack}
          backLabel={t("back")}
        />
        <main className={styles.main}>
          <Loader size="large" centered />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <SocialHeader
        title={t("editModalTitle")}
        onBack={handleBack}
        backLabel={t("back")}
        right={
          <Button
            variant="primary"
            size="small"
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
          >
            {isSaving ? "..." : t("editSave")}
          </Button>
        }
      />

      <main className={styles.main}>
        <div className={styles.section}>
          <HashtagTextarea
            className={styles.textarea}
            value={content}
            onChange={(e) =>
              setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))
            }
            maxLength={MAX_CONTENT_LENGTH}
            rows={8}
          />
          <span className={styles.charCount}>
            {t("charCount", { count: content.length })}
          </span>
        </div>

        <div className={styles.section}>
          <AttachmentUpload
            attachments={attachmentMgmt.attachments}
            onAttachmentAdd={attachmentMgmt.handleAttachmentAdd}
            onAttachmentDelete={attachmentMgmt.handleAttachmentDelete}
            disabled={isSaving}
            uploadType="social-post-attachment"
          />
        </div>
      </main>

      <ConfirmDialog
        isOpen={isBackConfirmOpen}
        title={tCommon("pageModal.closeConfirmTitle")}
        message={tCommon("pageModal.closeConfirmMessage")}
        confirmLabel={tCommon("pageModal.closeConfirmAction")}
        cancelLabel={tCommon("common.cancel")}
        onConfirm={handleConfirmBack}
        onCancel={() => setIsBackConfirmOpen(false)}
      />
    </div>
  );
}
