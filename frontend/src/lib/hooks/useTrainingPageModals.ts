import { useState } from "react";
import { type PageEditData } from "@/components/features/personal/PageEditModal/PageEditModal";

export function useTrainingPageModals() {
  const [isPageCreateModalOpen, setPageCreateModalOpen] = useState(false);
  const [isPageEditModalOpen, setPageEditModalOpen] = useState(false);
  const [editingPageData, setEditingPageData] = useState<PageEditData | null>(
    null,
  );
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetPageId, setDeleteTargetPageId] = useState<string | null>(
    null,
  );
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  const openEditModal = (data: PageEditData) => {
    setEditingPageData(data);
    setPageEditModalOpen(true);
  };

  const closeEditModal = () => {
    setPageEditModalOpen(false);
    setEditingPageData(null);
  };

  const openDeleteDialog = (id: string) => {
    setDeleteTargetPageId(id);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTargetPageId(null);
  };

  return {
    isPageCreateModalOpen,
    setPageCreateModalOpen,
    isPageEditModalOpen,
    editingPageData,
    openEditModal,
    closeEditModal,
    isDeleteDialogOpen,
    deleteTargetPageId,
    openDeleteDialog,
    closeDeleteDialog,
    isTagModalOpen,
    setIsTagModalOpen,
  };
}
