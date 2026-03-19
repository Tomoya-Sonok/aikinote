"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout/SocialHeader";
import { TagSectionWithNewInput } from "@/components/shared/TagSectionWithNewInput/TagSectionWithNewInput";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { useToast } from "@/contexts/ToastContext";
import {
  type CreatePagePayload,
  createPage,
  upsertTrainingDateAttendance,
} from "@/lib/api/client";
import { useAttachmentManagement } from "@/lib/hooks/useAttachmentManagement";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { useTagManagement } from "@/lib/hooks/useTagManagement";
import { formatToLocalDateString } from "@/lib/utils/dateUtils";
import styles from "./PageCreate.module.css";

export function PageCreate() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const returnUrl =
    searchParams.get("returnUrl") || `/${locale}/personal/pages`;
  const dateParam = searchParams.get("date");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);

  const tagManagement = useTagManagement({ shouldCreateInitialTags: true });
  const attachmentMgmt = useAttachmentManagement("page");

  // タイトルプレースホルダー
  const placeholderDateIso = dateParam
    ? new Date(`${dateParam}T00:00:00`).toISOString()
    : new Date().toISOString();
  const titlePlaceholder = t("pageCreate.titlePlaceholder", {
    date: formatToLocalDateString(placeholderDateIso),
  });

  // 自動フォーカス
  useEffect(() => {
    const id = setTimeout(() => titleInputRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, []);

  // 未保存データの保護
  const hasUnsavedChanges = useCallback(
    () =>
      title.trim() !== "" ||
      content.trim() !== "" ||
      attachmentMgmt.attachments.length > 0,
    [title, content, attachmentMgmt.attachments],
  );
  useBeforeUnload(hasUnsavedChanges);

  // バリデーション
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = t("pageModal.titleRequired");
    } else if (title.length > 35) {
      newErrors.title = t("pageModal.titleTooLong");
    }
    if (!content.trim()) {
      newErrors.content = t("pageModal.contentRequired");
    } else if (content.length > 3000) {
      newErrors.content = t("pageModal.contentTooLong");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, content, t]);

  const handleSubmit = useCallback(async () => {
    if (!user?.id || isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const pagePayload: CreatePagePayload = {
        title: title.trim(),
        tori: tagManagement.selectedTori,
        uke: tagManagement.selectedUke,
        waza: tagManagement.selectedWaza,
        content: content.trim(),
        user_id: user.id,
        is_public: false,
        ...(dateParam ? { created_at: `${dateParam}T00:00:00.000Z` } : {}),
      };

      const result = await createPage(pagePayload);

      if (result.success) {
        const pageId = result.data?.page?.id;
        if (pageId) {
          await attachmentMgmt.saveNewAttachments(pageId);
        }

        try {
          const createdAt =
            result.data?.page?.created_at ?? new Date().toISOString();
          await upsertTrainingDateAttendance({
            userId: user.id,
            trainingDate: formatToLocalDateString(createdAt),
          });
        } catch (err) {
          console.warn("稽古参加の自動登録に失敗:", err);
        }

        showToast(t("pageCreate.success"), "success");
        window.location.href = returnUrl;
      } else {
        throw new Error(
          ("error" in result && result.error) || "作成に失敗しました",
        );
      }
    } catch {
      showToast(t("pageCreate.createFailed") || "作成に失敗しました", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    isSubmitting,
    validateForm,
    title,
    content,
    tagManagement.selectedTori,
    tagManagement.selectedUke,
    tagManagement.selectedWaza,
    attachmentMgmt,
    showToast,
    t,
    returnUrl,
    dateParam,
  ]);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      setIsBackConfirmOpen(true);
    } else {
      window.location.href = returnUrl;
    }
  }, [hasUnsavedChanges, returnUrl]);

  const handleConfirmBack = useCallback(() => {
    setIsBackConfirmOpen(false);
    window.location.href = returnUrl;
  }, [returnUrl]);

  const isDisabled = isSubmitting || !title.trim() || !content.trim();

  return (
    <div className={styles.layout}>
      <SocialHeader
        title={t("pageCreate.title")}
        onBack={handleBack}
        backLabel={t("socialPosts.back")}
        right={
          <Button
            variant="primary"
            size="small"
            onClick={handleSubmit}
            disabled={isDisabled}
          >
            {isSubmitting ? "..." : t("pageCreate.save")}
          </Button>
        }
      />

      <main className={styles.main}>
        <div className={styles.section}>
          <TextInput
            ref={titleInputRef}
            label={t("pageModal.title")}
            required
            value={title}
            placeholder={titlePlaceholder}
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v);
              if (v.length > 35) {
                setErrors((prev) => ({
                  ...prev,
                  title: t("pageModal.titleTooLong"),
                }));
              } else {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.title;
                  return next;
                });
              }
            }}
            error={errors.title}
          />
        </div>

        <TagSectionWithNewInput
          category="tori"
          titleKey="pageModal.tori"
          tags={tagManagement.toriTags}
          selectedTags={tagManagement.selectedTori}
          tagManagement={tagManagement}
        />
        <TagSectionWithNewInput
          category="uke"
          titleKey="pageModal.uke"
          tags={tagManagement.ukeTags}
          selectedTags={tagManagement.selectedUke}
          tagManagement={tagManagement}
        />
        <TagSectionWithNewInput
          category="waza"
          titleKey="pageModal.waza"
          tags={tagManagement.wazaTags}
          selectedTags={tagManagement.selectedWaza}
          tagManagement={tagManagement}
        />

        <div className={styles.section}>
          <TextArea
            label={t("pageModal.content")}
            required
            value={content}
            placeholder={t("pageCreate.contentPlaceholder")}
            onChange={(e) => {
              const v = e.target.value;
              setContent(v);
              if (v.length > 3000) {
                setErrors((prev) => ({
                  ...prev,
                  content: t("pageModal.contentTooLong"),
                }));
              } else {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.content;
                  return next;
                });
              }
            }}
            error={errors.content}
            rows={5}
          />
        </div>

        <div className={styles.section}>
          <AttachmentUpload
            attachments={attachmentMgmt.attachments}
            onAttachmentAdd={attachmentMgmt.handleAttachmentAdd}
            onAttachmentDelete={attachmentMgmt.handleAttachmentDelete}
            disabled={isSubmitting}
          />
        </div>
      </main>

      <ConfirmDialog
        isOpen={isBackConfirmOpen}
        title={t("pageModal.closeConfirmTitle")}
        message={t("pageModal.closeConfirmMessage")}
        confirmLabel={t("pageModal.closeConfirmAction")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleConfirmBack}
        onCancel={() => setIsBackConfirmOpen(false)}
      />
    </div>
  );
}
