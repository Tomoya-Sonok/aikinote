"use client";

import { PlusCircle } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { Loader } from "@/components/shared/Loader";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout/SocialHeader";
import { OfflineHint } from "@/components/shared/OfflineHint/OfflineHint";
import { TagSectionWithNewInput } from "@/components/shared/TagSectionWithNewInput/TagSectionWithNewInput";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { MAX_CATEGORIES } from "@/constants/tags";
import { useToast } from "@/contexts/ToastContext";
import { updatePage } from "@/lib/api/client";
import { useAttachmentManagement } from "@/lib/hooks/useAttachmentManagement";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { usePageDetailData } from "@/lib/hooks/usePageDetailData";
import { useTagManagement } from "@/lib/hooks/useTagManagement";
import { useTrainingTags } from "@/lib/hooks/useTrainingTags";
import { useRouter } from "@/lib/i18n/routing";
import { getNetworkAwareErrorMessage } from "@/lib/utils/offlineError";
import styles from "./PageEdit.module.css";

export function PageEdit() {
  const { user } = useAuth();
  const t = useTranslations();
  const { showToast } = useToast();
  const params = useParams();
  const pageId = params.page_id as string;
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

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
  const tagManagement = useTagManagement();

  // カテゴリ追加
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const canAddCategory = tagManagement.categories.length < MAX_CATEGORIES;

  const handleAddCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    setIsCreatingCategory(true);
    try {
      await tagManagement.handleCreateCategory(trimmed);
      setNewCategoryInput("");
      setShowAddCategory(false);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // 添付管理
  const attachmentMgmt = useAttachmentManagement("page");

  // ページデータが読み込まれたらフォームに設定
  useEffect(() => {
    if (pageData && availableTags.length > 0 && !initialized) {
      setTitle(pageData.title);
      setContent(pageData.content);
      attachmentMgmt.setAttachments(initialAttachments);

      // タグの選択状態をカテゴリ別に設定
      for (const cat of tagManagement.categories) {
        const selected = pageData.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === cat.name),
        );
        tagManagement.setSelectedByCategory(cat.name, selected);
      }
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
      // 動的カテゴリからtagsペイロードを構築
      const tags: Record<string, string[]> = {};
      for (const cat of tagManagement.categories) {
        const selected = tagManagement.selectedByCategory[cat.name] ?? [];
        if (selected.length > 0) tags[cat.name] = selected;
      }

      const response = await updatePage({
        id: pageId,
        title: title.trim(),
        tags,
        content: content.trim(),
        user_id: user.id,
        is_public: pageData.is_public,
      });

      if (response.success) {
        // 新規追加された添付を保存
        await attachmentMgmt.saveNewAttachments(pageId);

        // 詳細・一覧キャッシュを無効化して、戻り先で staleTime=2 分内でも
        // 最新内容が反映されるようにする（PR #273 staleTime 延長と PR #274
        // PageCreate の invalidate に揃えるため）
        queryClient.invalidateQueries({
          queryKey: ["page-detail", pageId],
        });
        queryClient.invalidateQueries({ queryKey: ["training-pages"] });

        isNavigatingRef.current = true;
        router.replace(`/personal/pages/${pageId}`);
      } else {
        throw new Error(
          "error" in response ? response.error : "更新に失敗しました",
        );
      }
    } catch (error) {
      showToast(
        getNetworkAwareErrorMessage(error, t("pageDetail.updateFailed")),
        "error",
      );
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
    tagManagement.categories,
    tagManagement.selectedByCategory,
    showToast,
    t,
    router,
    queryClient,
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
        <OfflineHint />
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

        {tagManagement.categories.map((cat) => (
          <TagSectionWithNewInput
            key={cat.slug}
            category={cat.name}
            title={cat.is_default ? t(`pageModal.${cat.slug}`) : cat.name}
            tags={tagManagement.tagsByCategory[cat.name] ?? []}
            selectedTags={tagManagement.selectedByCategory[cat.name] ?? []}
            tagManagement={tagManagement}
          />
        ))}

        {/* カテゴリ追加 */}
        <div className={styles.addCategoryWrapper}>
          <div className={styles.addCategoryArea}>
            {showAddCategory ? (
              <div className={styles.addCategoryForm}>
                <input
                  type="text"
                  className={styles.addCategoryInput}
                  placeholder={t("tagManagement.categoryNamePlaceholder")}
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowAddCategory(false);
                      setNewCategoryInput("");
                    }
                  }}
                  maxLength={10}
                  disabled={isCreatingCategory}
                />
                <Button
                  variant="cancel"
                  size="small"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryInput("");
                  }}
                >
                  {t("tagFilterModal.cancel")}
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleAddCategory}
                  disabled={isCreatingCategory || !newCategoryInput.trim()}
                >
                  {t("pageModal.add")}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => setShowAddCategory(true)}
                disabled={!canAddCategory}
              >
                <PlusCircle size={16} weight="light" />
                {t("tagManagement.addCategory")}
              </button>
            )}
          </div>
          <div className={styles.skeletonTags}>
            <span className={styles.skeletonTag} style={{ width: 48 }} />
            <span className={styles.skeletonTag} style={{ width: 64 }} />
            <span className={styles.skeletonTag} style={{ width: 40 }} />
          </div>
        </div>

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
