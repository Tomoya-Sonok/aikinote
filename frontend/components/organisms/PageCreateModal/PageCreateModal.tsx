import type { FC } from "react";
import { type PageFormData, PageModal } from "../PageModal/PageModal";

interface PageCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pageData: PageCreateData) => void;
}

export interface PageCreateData {
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  comment: string;
}

export const PageCreateModal: FC<PageCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const handleSubmit = (formData: PageFormData) => {
    onSave({
      title: formData.title,
      tori: formData.tori,
      uke: formData.uke,
      waza: formData.waza,
      content: formData.content,
      comment: formData.comment,
    });
  };

  return (
    <PageModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      modalTitle="ページ作成"
      actionButtonText="保存"
      shouldCreateInitialTags={true}
    />
  );
};
