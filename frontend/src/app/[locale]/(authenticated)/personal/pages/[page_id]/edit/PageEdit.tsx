"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { Loader } from "@/components/shared/Loader";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout/SocialHeader";
import { TagSectionWithNewInput } from "@/components/shared/TagSectionWithNewInput/TagSectionWithNewInput";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { useToast } from "@/contexts/ToastContext";
import { updatePage } from "@/lib/api/client";
import { useAttachmentManagement } from "@/lib/hooks/useAttachmentManagement";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { usePageDetailData } from "@/lib/hooks/usePageDetailData";
import { useTagManagement } from "@/lib/hooks/useTagManagement";
import { useTrainingTags } from "@/lib/hooks/useTrainingTags";
import { useRouter } from "@/lib/i18n/routing";
import styles from "./PageEdit.module.css";

export function PageEdit() {
  const { user } = useAuth();
  const t = useTranslations();
  const { showToast } = useToast();
  const params = useParams();
  const pageId = params.page_id as string;
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const {
    loading: pageLoading,
    pageData,
    attachments: initialAttachments,
  } = usePageDetailData(pageId);
  const { availableTags } = useTrainingTags();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // タグ管理
  const tagManagement = useTagManagement({ shouldCreateInitialTags: false });

  // 添付管理
  const attachmentMgmt = useAttachmentManagement("page");

  // ページデータが読み込まれたらフォームに設定
  useEffect(() => {
    if (pageData && availableTags.length > 0 && !initialized) {
      setTitle(pageData.title);
      setContent(pageData.content);
      attachmentMgmt.setAttachments(initialAttachments);

      // タグの選択状態を設定
      const tori = pageData.tags.filter((tag) =>
        availableTags.find((t) => t.name === tag && t.category === "取り"),
      );
      const uke = pageData.tags.filter((tag) =>
        availableTags.find((t) => t.name === tag && t.category === "受け"),
      );
      const waza = pageData.tags.filter((tag) =>
        availableTags.find((t) => t.name === tag && t.category === "技"),
      );
      tagManagement.setSelectedTori(tori);
      tagManagement.setSelectedUke(uke);
      tagManagement.setSelectedWaza(waza);
      setInitialized(true);
    }
  }, [
    pageData,
    initialAttachments,
    availableTags,
    initialized,
    tagManagement,
    attachmentMgmt,
  ]);

  // 未保存データの保護
  const hasUnsavedChanges = useCallback(() => {
    if (!pageData) return false;
    return (
      title.trim() !== pageData.title.trim() ||
      content.trim() !== pageData.content.trim() ||
      attachmentMgmt.attachments.length !== initialAttachments.length
    );
  }, [
    title,
    content,
    attachmentMgmt.attachments,
    pageData,
    initialAttachments,
  ]);

  const isNavigatingRef = useRef(false);
  useBeforeUnload(
    useCallback(
      () => !isNavigatingRef.current && hasUnsavedChanges(),
      [hasUnsavedChanges],
    ),
  );

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

  // 送信
  const handleSubmit = useCallback(async () => {
    if (!user?.id || isSubmitting || !pageData) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await updatePage({
        id: pageId,
        title: title.trim(),
        tori: tagManagement.selectedTori,
        uke: tagManagement.selectedUke,
        waza: tagManagement.selectedWaza,
        content: content.trim(),
        user_id: user.id,
        is_public: pageData.is_public,
      });

      if (response.success) {
        // 新規追加された添付を保存
        await attachmentMgmt.saveNewAttachments(pageId);

        isNavigatingRef.current = true;
        router.replace(`/personal/pages/${pageId}`);
      } else {
        throw new Error(
          "error" in response ? response.error : "更新に失敗しました",
        );
      }
    } catch {
      showToast(t("pageDetail.updateFailed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    isSubmitting,
    validateForm,
    pageData,
    pageId,
    title,
    content,
    attachmentMgmt,
    tagManagement.selectedTori,
    tagManagement.selectedUke,
    tagManagement.selectedWaza,
    showToast,
    t,
    router,
  ]);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      setIsBackConfirmOpen(true);
    } else {
      router.replace(`/personal/pages/${pageId}`);
    }
  }, [hasUnsavedChanges, router, pageId]);

  const handleConfirmBack = useCallback(() => {
    setIsBackConfirmOpen(false);
    router.replace(`/personal/pages/${pageId}`);
  }, [router, pageId]);

  if (pageLoading || !initialized) {
    return (
      <div className={styles.layout}>
        <SocialHeader
          title={t("pageDetail.edit")}
          onBack={handleBack}
          backLabel={t("socialPosts.back")}
        />
        <main className={styles.main}>
          <Loader size="large" centered />
        </main>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className={styles.layout}>
        <SocialHeader
          title={t("pageDetail.edit")}
          onBack={handleBack}
          backLabel={t("socialPosts.back")}
        />
        <main className={styles.main}>
          <p>{t("pageDetail.notFound")}</p>
        </main>
      </div>
    );
  }

  const isDisabled = isSubmitting || !title.trim() || !content.trim();

  return (
    <div className={styles.layout}>
      <SocialHeader
        title={t("pageDetail.edit")}
        onBack={handleBack}
        backLabel={t("socialPosts.back")}
        right={
          <Button
            variant="primary"
            size="small"
            onClick={handleSubmit}
            disabled={isDisabled}
          >
            {isSubmitting ? "..." : t("pageDetail.update") || "更新"}
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
