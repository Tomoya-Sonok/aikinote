import type { FC } from "react";
import type { UpdatePagePayload } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { AttachmentData } from "../AttachmentCard/AttachmentCard";
import { type PageFormData, PageModal } from "../PageModal/PageModal";

export interface PageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (pageData: UpdatePagePayload) => void;
  initialData: PageEditData;
}

export interface PageEditData {
  id: string;
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  comment: string;
  attachments: AttachmentData[];
}

export const PageEditModal: FC<PageEditModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  initialData,
}) => {
  const { user } = useAuth();

  const handleSubmit = async (formData: PageFormData) => {
    if (user?.id) {
      const updateData: UpdatePagePayload = {
        id: initialData.id,
        title: formData.title,
        tori: formData.tori,
        uke: formData.uke,
        waza: formData.waza,
        content: formData.content,
        comment: formData.comment,
        user_id: user.id,
      };
      onUpdate(updateData);

      // 新規追加された添付（temp- IDのもの）をDBに保存
      const newAttachments = formData.attachments.filter((a) =>
        a.id.startsWith("temp-"),
      );
      for (const attachment of newAttachments) {
        try {
          // biome-ignore lint/suspicious/noExplicitAny: _fileKey は内部拡張プロパティ
          const fileKey = (attachment as any)._fileKey as string | undefined;

          const payload: Record<string, unknown> = {
            page_id: initialData.id,
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

          await fetch("/api/page-attachments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          console.warn("添付メタデータの保存に失敗:", err);
        }
      }
    }
  };

  return (
    <PageModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialData={initialData}
      modalTitle="ページ編集"
      actionButtonText="更新"
      shouldCreateInitialTags={false}
    />
  );
};
