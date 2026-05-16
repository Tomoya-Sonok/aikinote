"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/shared/Button/Button";
import { TagSelection } from "@/components/shared/TagSelection/TagSelection";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import type { UseTagManagementReturn } from "@/lib/hooks/useTagManagement";
import styles from "./TagSectionWithNewInput.module.css";

interface TagSectionWithNewInputProps {
  category: string;
  titleKey?: string;
  title?: string;
  tags: string[];
  selectedTags: string[];
  tagManagement: UseTagManagementReturn;
}

export function TagSectionWithNewInput({
  category,
  titleKey,
  title,
  tags,
  selectedTags,
  tagManagement,
}: TagSectionWithNewInputProps) {
  const t = useTranslations();
  const isOnline = useOnlineStatus();

  const displayTitle = title ?? (titleKey ? t(titleKey) : category);

  return (
    <div className={styles.section}>
      <TagSelection
        title={displayTitle}
        tags={tags}
        selectedTags={selectedTags}
        onTagToggle={(tag) => tagManagement.handleTagToggle(category, tag)}
        onAddNew={() => tagManagement.setShowNewTagInput(category)}
        onCancel={tagManagement.handleCancelNewTag}
        showAddButton={tagManagement.showNewTagInput !== category}
      />
      {tagManagement.showNewTagInput === category && (
        <div className={styles.newTagInput}>
          <input
            type="text"
            placeholder={t("pageModal.addNewTag")}
            value={tagManagement.newTagInput}
            onChange={(e) => tagManagement.setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") tagManagement.handleCancelNewTag();
            }}
            maxLength={20}
          />
          <Button
            variant="primary"
            size="small"
            onClick={() => tagManagement.handleSubmitNewTag(category)}
            disabled={
              tagManagement.loading ||
              !tagManagement.newTagInput.trim() ||
              !isOnline
            }
            title={
              !isOnline ? t("offlineGuard.actionRequiresNetwork") : undefined
            }
          >
            {t("pageModal.add")}
          </Button>
        </div>
      )}
    </div>
  );
}
