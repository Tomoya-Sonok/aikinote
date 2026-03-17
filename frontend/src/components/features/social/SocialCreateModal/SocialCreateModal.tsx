"use client";

import { useTranslations } from "next-intl";
import {
  type FC,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { AttachmentData } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import { AttachmentUpload } from "@/components/features/personal/AttachmentUpload/AttachmentUpload";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { TagSelection } from "@/components/shared/TagSelection/TagSelection";
import { TextArea } from "@/components/shared/TextArea/TextArea";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { useToast } from "@/contexts/ToastContext";
import {
  type CreateTagPayload,
  createAttachment,
  createPage,
  createSocialPost,
  createTag,
  getTags,
  initializeUserTags,
  upsertTrainingDateAttendance,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatToLocalDateString } from "@/lib/utils/dateUtils";
import styles from "./SocialCreateModal.module.css";

type CreateMode = "post" | "training";

const MAX_POST_CONTENT_LENGTH = 2000;

interface SocialCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const SocialCreateModal: FC<SocialCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { user } = useAuth();
  const t = useTranslations();
  const tSocial = useTranslations("socialPosts");
  const { showToast } = useToast();
  const modeGroupId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<CreateMode>("post");

  // 投稿モード用
  const [postContent, setPostContent] = useState("");
  const [postAttachments, setPostAttachments] = useState<AttachmentData[]>([]);

  // 稽古記録モード用
  const [trainingTitle, setTrainingTitle] = useState("");
  const [trainingContent, setTrainingContent] = useState("");
  const [trainingComment, setTrainingComment] = useState("");
  const [trainingAttachments, setTrainingAttachments] = useState<
    AttachmentData[]
  >([]);
  const [selectedTori, setSelectedTori] = useState<string[]>([]);
  const [selectedUke, setSelectedUke] = useState<string[]>([]);
  const [selectedWaza, setSelectedWaza] = useState<string[]>([]);

  // タグ管理
  const [toriTags, setToriTags] = useState<string[]>([]);
  const [ukeTags, setUkeTags] = useState<string[]>([]);
  const [wazaTags, setWazaTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<
    { id: string; name: string; category: string; user_id: string }[]
  >([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState<string | null>(null);
  const [initialTagsCreated, setInitialTagsCreated] = useState(false);

  // 共通
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);

  // リセット
  useEffect(() => {
    if (!isOpen) {
      setMode("post");
      setPostContent("");
      setPostAttachments([]);
      setTrainingTitle("");
      setTrainingContent("");
      setTrainingComment("");
      setTrainingAttachments([]);
      setSelectedTori([]);
      setSelectedUke([]);
      setSelectedWaza([]);
      setErrors({});
      setIsSubmitting(false);
      setIsCloseConfirmOpen(false);
      setNewTagInput("");
      setShowNewTagInput(null);
    }
  }, [isOpen]);

  // タグ取得（PageModalと同じロジック）
  const fetchTags = useCallback(async () => {
    if (!user?.id || !isOpen) return;
    try {
      setTagsLoading(true);
      const response = await getTags(user.id);
      if (response.success && response.data) {
        setAllTags(response.data);
        if (response.data.length === 0 && !initialTagsCreated) {
          try {
            setInitialTagsCreated(true);
            await initializeUserTags(user.id);
            const updated = await getTags(user.id);
            if (updated.success && updated.data) {
              setAllTags(updated.data);
              showToast(t("pageModal.initialTagsCreated"), "success");
            }
          } catch {
            setInitialTagsCreated(false);
          }
        }
      }
    } catch {
      // タグ取得失敗は致命的ではない
    } finally {
      setTagsLoading(false);
    }
  }, [user?.id, isOpen, initialTagsCreated, showToast, t]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // タグをカテゴリ別に分類
  useEffect(() => {
    if (allTags.length > 0) {
      setToriTags(
        allTags.filter((tag) => tag.category === "取り").map((tag) => tag.name),
      );
      setUkeTags(
        allTags.filter((tag) => tag.category === "受け").map((tag) => tag.name),
      );
      setWazaTags(
        allTags.filter((tag) => tag.category === "技").map((tag) => tag.name),
      );
    }
  }, [allTags]);

  // 稽古記録モード切り替え時にタイトルへフォーカス
  useEffect(() => {
    if (mode === "training" && isOpen && titleInputRef.current) {
      const id = setTimeout(() => titleInputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [mode, isOpen]);

  // タグ切り替え
  const handleTagToggle = (category: "tori" | "uke" | "waza", tag: string) => {
    const setters = {
      tori: setSelectedTori,
      uke: setSelectedUke,
      waza: setSelectedWaza,
    };
    setters[category]((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // 新規タグ作成（PageModalと同じロジック）
  const handleCreateTag = async (tagData: CreateTagPayload) => {
    try {
      const response = await createTag(tagData);
      if (response.success && response.data) {
        await fetchTags();
        setNewTagInput("");
        setShowNewTagInput(null);
        showToast(t("pageModal.tagAdded"), "success");

        const categoryMap: Record<string, "tori" | "uke" | "waza"> = {
          取り: "tori",
          受け: "uke",
          技: "waza",
        };
        const cat = categoryMap[response.data.category];
        if (cat) handleTagToggle(cat, response.data.name);
      }
    } catch (error) {
      showToast(
        `${t("pageModal.tagAddFailed")}: ${error instanceof Error ? error.message : t("pageModal.unknownError")}`,
        "error",
      );
    }
  };

  const handleSubmitNewTag = (category: string) => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 20) {
      showToast(t("pageModal.tagNameTooLong"), "error");
      return;
    }
    if (!/^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９]+$/.test(trimmed)) {
      showToast(t("pageModal.tagNameInvalid"), "error");
      return;
    }
    const categoryMap: Record<string, "取り" | "受け" | "技"> = {
      tori: "取り",
      uke: "受け",
      waza: "技",
    };
    if (!categoryMap[category] || !user?.id) return;
    handleCreateTag({
      name: trimmed,
      category: categoryMap[category],
      user_id: user.id,
    });
  };

  // バリデーション（PageModal と同じパターン）
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === "post") {
      if (!postContent.trim()) {
        newErrors.content = tSocial("contentRequired");
      } else if (postContent.length > MAX_POST_CONTENT_LENGTH) {
        newErrors.content = tSocial("contentTooLong");
      }
    } else {
      if (!trainingTitle.trim()) {
        newErrors.title = t("pageModal.titleRequired");
      } else if (trainingTitle.length > 35) {
        newErrors.title = t("pageModal.titleTooLong");
      }
      if (!trainingContent.trim()) {
        newErrors.content = t("pageModal.contentRequired");
      } else if (trainingContent.length > 3000) {
        newErrors.content = t("pageModal.contentTooLong");
      }
      if (trainingComment.length > 1000) {
        newErrors.comment = t("pageModal.commentTooLong");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 投稿モード送信
  const handlePostSubmit = useCallback(async () => {
    if (!user?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createSocialPost({
        user_id: user.id,
        content: postContent.trim(),
        post_type: "post",
      });

      if (result.success && result.data && postAttachments.length > 0) {
        const postId = (result.data as { id: string }).id;
        for (let i = 0; i < postAttachments.length; i++) {
          const att = postAttachments[i];
          const fileKey = (att as unknown as Record<string, string>)._fileKey;
          try {
            await fetch("/api/social-post-attachments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                post_id: postId,
                type: att.type,
                file_key: fileKey || undefined,
                url: att.type === "youtube" ? att.url : undefined,
                original_filename: att.original_filename || undefined,
                file_size_bytes: att.file_size_bytes || undefined,
                sort_order: i,
              }),
            });
          } catch {
            // 個別の添付保存失敗は投稿自体を失敗にしない
          }
        }
      }

      showToast(tSocial("createSuccess"), "success");
      onCreated();
      onClose();
    } catch {
      showToast(tSocial("createFailed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    postContent,
    isSubmitting,
    postAttachments,
    showToast,
    tSocial,
    onCreated,
    onClose,
  ]);

  // 稽古記録モード送信
  const handleTrainingSubmit = useCallback(async () => {
    if (!user?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createPage({
        title: trainingTitle.trim(),
        tori: selectedTori,
        uke: selectedUke,
        waza: selectedWaza,
        content: trainingContent.trim(),
        comment: trainingComment.trim(),
        user_id: user.id,
        is_public: true,
      });

      if (result.success) {
        const pageId = result.data?.page?.id;

        // 添付ファイルを PageAttachment に保存
        if (pageId && trainingAttachments.length > 0) {
          for (const attachment of trainingAttachments) {
            try {
              const attachmentPayload: Record<string, unknown> = {
                page_id: pageId,
                type: attachment.type,
                original_filename: attachment.original_filename ?? null,
                file_size_bytes: attachment.file_size_bytes ?? null,
                thumbnail_url: attachment.thumbnail_url ?? null,
              };
              if (attachment.type === "youtube") {
                attachmentPayload.url = attachment.url;
              } else {
                attachmentPayload.file_key = attachment._fileKey;
              }
              await createAttachment(attachmentPayload);
            } catch (attachError) {
              console.warn("添付メタデータの保存に失敗:", attachError);
            }
          }
        }

        // 稽古参加登録（カレンダーに◯を付ける）
        try {
          const createdAt =
            result.data?.page?.created_at ?? new Date().toISOString();
          await upsertTrainingDateAttendance({
            userId: user.id,
            trainingDate: formatToLocalDateString(createdAt),
          });
        } catch (attendanceError) {
          console.warn("稽古参加の自動登録に失敗:", attendanceError);
        }

        showToast(tSocial("trainingCreateSuccess"), "success");
        onCreated();
        onClose();
      } else {
        throw new Error(
          ("error" in result && result.error) || tSocial("createFailed"),
        );
      }
    } catch {
      showToast(tSocial("createFailed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    isSubmitting,
    trainingTitle,
    trainingContent,
    trainingComment,
    selectedTori,
    selectedUke,
    selectedWaza,
    trainingAttachments,
    showToast,
    tSocial,
    onCreated,
    onClose,
  ]);

  // いずれかのテキスト項目に入力がある場合のみ true
  const hasTextInput = () => {
    if (mode === "post") {
      return postContent.trim() !== "";
    }
    return (
      trainingTitle.trim() !== "" ||
      trainingContent.trim() !== "" ||
      trainingComment.trim() !== ""
    );
  };

  const closeModal = () => {
    setIsCloseConfirmOpen(false);
    onClose();
  };

  const handleRequestClose = () => {
    if (isCloseConfirmOpen) return;
    if (hasTextInput()) {
      setIsCloseConfirmOpen(true);
    } else {
      closeModal();
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    if (mode === "post") {
      handlePostSubmit();
    } else {
      handleTrainingSubmit();
    }
  };

  if (!isOpen) return null;

  // タグセクション用のヘルパー（PageModal と同じUI）
  const renderTagSection = (
    category: "tori" | "uke" | "waza",
    titleKey: string,
    tags: string[],
    selected: string[],
  ) => (
    <div className={styles.section}>
      <TagSelection
        title={t(titleKey)}
        tags={tags}
        selectedTags={selected}
        onTagToggle={(tag) => handleTagToggle(category, tag)}
        onAddNew={() => setShowNewTagInput(category)}
        showAddButton={showNewTagInput !== category}
      />
      {showNewTagInput === category && (
        <div className={styles.newTagInput}>
          <input
            type="text"
            placeholder={t("pageModal.addNewTag")}
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNewTagInput("");
                setShowNewTagInput(null);
              }
            }}
            maxLength={20}
          />
          <button
            type="button"
            onClick={() => handleSubmitNewTag(category)}
            disabled={tagsLoading}
          >
            {t("pageModal.add")}
          </button>
          <button
            type="button"
            onClick={() => {
              setNewTagInput("");
              setShowNewTagInput(null);
            }}
          >
            {t("common.cancel")}
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        handleRequestClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && handleRequestClose()}
      role="dialog"
      aria-modal="true"
    >
      <dialog
        open
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{tSocial("createModalTitle")}</h2>
        </div>

        <div className={styles.content}>
          {/* モード切り替え */}
          <div className={styles.section}>
            <span id={modeGroupId} style={{ display: "none" }}>
              {tSocial("postType")}
            </span>
            <div
              className={styles.modeSelector}
              role="radiogroup"
              aria-labelledby={modeGroupId}
            >
              <label
                className={`${styles.modeButton} ${mode === "post" ? styles.modeActive : ""}`}
              >
                <input
                  type="radio"
                  name="createMode"
                  value="post"
                  checked={mode === "post"}
                  onChange={() => setMode("post")}
                  className={styles.modeRadio}
                />
                <span className={styles.modeText}>
                  {tSocial("createTypePost")}
                </span>
              </label>
              <label
                className={`${styles.modeButton} ${mode === "training" ? styles.modeActive : ""}`}
              >
                <input
                  type="radio"
                  name="createMode"
                  value="training"
                  checked={mode === "training"}
                  onChange={() => setMode("training")}
                  className={styles.modeRadio}
                />
                <span className={styles.modeText}>
                  {tSocial("createTypeTraining")}
                </span>
              </label>
            </div>
          </div>

          {/* 投稿モード */}
          {mode === "post" && (
            <>
              <div className={styles.section}>
                <TextArea
                  label={tSocial("contentLabel")}
                  required
                  enableHashtagHighlight
                  value={postContent}
                  placeholder={tSocial("contentPlaceholder")}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, MAX_POST_CONTENT_LENGTH);
                    setPostContent(v);
                    if (errors.content && v.trim()) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.content;
                        return next;
                      });
                    }
                  }}
                  error={errors.content}
                  rows={8}
                />
                <span className={styles.charCount}>
                  {tSocial("charCount", { count: postContent.length })}
                </span>
              </div>

              <div className={styles.section}>
                <AttachmentUpload
                  attachments={postAttachments}
                  onAttachmentAdd={(att) =>
                    setPostAttachments((prev) => [...prev, att])
                  }
                  onAttachmentDelete={async (id) =>
                    setPostAttachments((prev) =>
                      prev.filter((a) => a.id !== id),
                    )
                  }
                  disabled={isSubmitting}
                  uploadType="social-post-attachment"
                />
              </div>
            </>
          )}

          {/* 稽古記録モード（PageModal と同じフォーム） */}
          {mode === "training" && (
            <>
              <div className={styles.section}>
                <TextInput
                  ref={titleInputRef}
                  label={t("pageModal.title")}
                  required
                  value={trainingTitle}
                  placeholder={t("pageCreate.contentPlaceholder")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTrainingTitle(v);
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

              {renderTagSection(
                "tori",
                "pageModal.tori",
                toriTags,
                selectedTori,
              )}
              {renderTagSection("uke", "pageModal.uke", ukeTags, selectedUke)}
              {renderTagSection(
                "waza",
                "pageModal.waza",
                wazaTags,
                selectedWaza,
              )}

              <div className={styles.section}>
                <TextArea
                  label={t("pageModal.content")}
                  required
                  value={trainingContent}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTrainingContent(v);
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
                <TextArea
                  label={t("pageModal.comment")}
                  value={trainingComment}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTrainingComment(v);
                    if (v.length > 1000) {
                      setErrors((prev) => ({
                        ...prev,
                        comment: t("pageModal.commentTooLong"),
                      }));
                    } else {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.comment;
                        return next;
                      });
                    }
                  }}
                  rows={3}
                  error={errors.comment}
                />
              </div>

              <div className={styles.section}>
                <AttachmentUpload
                  attachments={trainingAttachments}
                  onAttachmentAdd={(att) =>
                    setTrainingAttachments((prev) => [...prev, att])
                  }
                  onAttachmentDelete={async (id) =>
                    setTrainingAttachments((prev) =>
                      prev.filter((a) => a.id !== id),
                    )
                  }
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="cancel" onClick={handleRequestClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {mode === "post" ? tSocial("submit") : t("pageCreate.save")}
          </Button>
        </div>
      </dialog>

      <ConfirmDialog
        isOpen={isCloseConfirmOpen}
        title={t("pageModal.closeConfirmTitle")}
        message={t("pageModal.closeConfirmMessage")}
        confirmLabel={t("pageModal.closeConfirmAction")}
        cancelLabel={t("common.cancel")}
        onConfirm={closeModal}
        onCancel={() => setIsCloseConfirmOpen(false)}
      />
    </div>,
    document.body,
  );
};
