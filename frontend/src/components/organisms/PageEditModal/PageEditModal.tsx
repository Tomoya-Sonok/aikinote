import type { FC } from "react";
import type { UpdatePagePayload } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { type PageFormData, PageModal } from "../PageModal/PageModal";

interface PageEditModalProps {
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
}

export const PageEditModal: FC<PageEditModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  initialData,
}) => {
  const { user } = useAuth();

  const handleSubmit = (formData: PageFormData) => {
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
