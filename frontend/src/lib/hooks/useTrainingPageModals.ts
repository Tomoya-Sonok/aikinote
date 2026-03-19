import { useState } from "react";

export function useTrainingPageModals() {
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetPageId, setDeleteTargetPageId] = useState<string | null>(
    null,
  );
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  const openDeleteDialog = (id: string) => {
    setDeleteTargetPageId(id);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTargetPageId(null);
  };

  return {
    isDeleteDialogOpen,
    deleteTargetPageId,
    openDeleteDialog,
    closeDeleteDialog,
    isTagModalOpen,
    setIsTagModalOpen,
  };
}
