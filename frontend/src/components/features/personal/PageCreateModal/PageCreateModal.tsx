import { useTranslations } from "next-intl";
import type { FC } from "react";
import { formatToLocalDateString } from "@/lib/utils/dateUtils";
import type { AttachmentData } from "../AttachmentCard/AttachmentCard";
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
  attachments: AttachmentData[];
}

export const PageCreateModal: FC<PageCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const t = useTranslations();
  const handleSubmit = (formData: PageFormData) => {
    onSave({
      title: formData.title,
      tori: formData.tori,
      uke: formData.uke,
      waza: formData.waza,
      content: formData.content,
      comment: formData.comment,
      attachments: formData.attachments,
    });
  };

  const titlePlaceholder = t("pageCreate.titlePlaceholder", {
    date: formatToLocalDateString(new Date().toISOString()),
  });
  const contentPlaceholder = t("pageCreate.contentPlaceholder");

  return (
    <PageModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      modalTitle={t("pageCreate.title")}
      actionButtonText={t("pageCreate.save")}
      shouldCreateInitialTags={true}
      autoFocusTitle={true}
      titlePlaceholder={titlePlaceholder}
      contentPlaceholder={contentPlaceholder}
    />
  );
};
