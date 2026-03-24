"use client";

import { useTranslations } from "next-intl";
import { TagSelection } from "@/components/shared/TagSelection/TagSelection";
import type { UseTagManagementReturn } from "@/lib/hooks/useTagManagement";
import styles from "./TagSectionWithNewInput.module.css";

interface TagSectionWithNewInputProps {
  category: "tori" | "uke" | "waza";
  titleKey: string;
  tags: string[];
  selectedTags: string[];
  tagManagement: UseTagManagementReturn;
}

export function TagSectionWithNewInput({
  category,
  titleKey,
  tags,
  selectedTags,
  tagManagement,
}: TagSectionWithNewInputProps) {
  const t = useTranslations();

  return (
    <div className={styles.section}>
      <TagSelection
        title={t(titleKey)}
        tags={tags}
        selectedTags={selectedTags}
        onTagToggle={(tag) => tagManagement.handleTagToggle(category, tag)}
        onAddNew={() => tagManagement.setShowNewTagInput(category)}
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
          <button
            type="button"
            onClick={() => tagManagement.handleSubmitNewTag(category)}
            disabled={tagManagement.loading}
          >
            {t("pageModal.add")}
          </button>
          <button type="button" onClick={tagManagement.handleCancelNewTag}>
            {t("common.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
