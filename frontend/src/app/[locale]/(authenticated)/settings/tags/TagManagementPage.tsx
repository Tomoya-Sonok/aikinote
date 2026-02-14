"use client";

import { useTranslations } from "next-intl";
import {
  type DragEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditIcon } from "@/components/shared/icons/EditIcon";
import { Loader } from "@/components/shared/Loader/Loader";
import { Tag } from "@/components/shared/Tag/Tag";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";
import {
  createTag,
  deleteTag,
  getTags,
  type UpdateTagOrderPayload,
  updateTagOrder,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./TagManagementPage.module.css";

interface TagItem {
  id: string;
  name: string;
  category: "取り" | "受け" | "技";
  user_id: string;
  created_at: string;
  sort_order: number | null;
}

type CategoryKey = "tori" | "uke" | "waza";

type TagGroupMap = Record<CategoryKey, TagItem[]>;

type OrderMap = Record<CategoryKey, string[]>;

const CATEGORY_LABEL_MAP: Record<CategoryKey, TagItem["category"]> = {
  tori: "取り",
  uke: "受け",
  waza: "技",
};

const REVERSE_CATEGORY_MAP: Record<TagItem["category"], CategoryKey> = {
  取り: "tori",
  受け: "uke",
  技: "waza",
};

const CATEGORY_KEYS: CategoryKey[] = ["tori", "uke", "waza"];

const EMPTY_GROUPS: TagGroupMap = {
  tori: [],
  uke: [],
  waza: [],
};

const EMPTY_ORDERS: OrderMap = {
  tori: [],
  uke: [],
  waza: [],
};

const DRAG_ACTIVATION_THRESHOLD_PX = 6;
type ReactTouchList = TouchEvent<HTMLUListElement>["touches"];
type TouchPoint = {
  identifier: number;
  clientX: number;
  clientY: number;
};

const getCategoryKey = (category: TagItem["category"]): CategoryKey | null => {
  return REVERSE_CATEGORY_MAP[category] ?? null;
};

const sortTagList = (tags: TagItem[]): TagItem[] => {
  return [...tags].sort((a, b) => {
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.name.localeCompare(b.name, "ja");
  });
};

const buildGroups = (items: TagItem[]): TagGroupMap => {
  const groups: TagGroupMap = {
    tori: [],
    uke: [],
    waza: [],
  };

  for (const tag of items) {
    const key = getCategoryKey(tag.category);
    if (!key) continue;
    groups[key].push(tag);
  }

  for (const key of CATEGORY_KEYS) {
    groups[key] = sortTagList(groups[key]);
  }

  return groups;
};

const extractOrders = (groups: TagGroupMap): OrderMap => {
  return {
    tori: groups.tori.map((tag) => tag.id),
    uke: groups.uke.map((tag) => tag.id),
    waza: groups.waza.map((tag) => tag.id),
  };
};

interface TagManagementPageProps {
  locale: string;
}

export function TagManagementPage({ locale }: TagManagementPageProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [tagGroups, setTagGroups] = useState<TagGroupMap>(EMPTY_GROUPS);
  const [initialOrder, setInitialOrder] = useState<OrderMap>(EMPTY_ORDERS);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<CategoryKey | null>(
    null,
  );
  const [newTagInputs, setNewTagInputs] = useState<Record<CategoryKey, string>>(
    {
      tori: "",
      uke: "",
      waza: "",
    },
  );
  const [submittingCategory, setSubmittingCategory] =
    useState<CategoryKey | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);
  const [draggingCategory, setDraggingCategory] = useState<CategoryKey | null>(
    null,
  );
  const [savingCategory, setSavingCategory] = useState<CategoryKey | null>(
    null,
  );

  const tagListRefs = useRef<Record<CategoryKey, HTMLUListElement | null>>({
    tori: null,
    uke: null,
    waza: null,
  });
  const activeTouchIdentifierRef = useRef<number | null>(null);
  const pendingTouchRef = useRef<{
    category: CategoryKey;
    tagId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const lastTouchTargetRef = useRef<string | "__END__" | null>(null);

  const groupOrders = useCallback((items: TagItem[]) => {
    const groups = buildGroups(items);
    setTagGroups(groups);
    setInitialOrder(extractOrders(groups));
  }, []);

  const fetchTags = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await getTags(user.id);

      if (!response.success) {
        showToast(
          ("error" in response && response.error) ||
            t("tagManagement.fetchFailed"),
          "error",
        );
        return;
      }

      if (Array.isArray(response.data)) {
        groupOrders(response.data as TagItem[]);
      }
    } catch (error) {
      console.error("タグ取得エラー:", error);
      showToast(t("tagManagement.fetchFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [groupOrders, showToast, t, user?.id]);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  const hasOrderChanged = useCallback(
    (category: CategoryKey) => {
      const currentOrder = tagGroups[category].map((tag) => tag.id);
      const baseOrder = initialOrder[category];

      if (currentOrder.length !== baseOrder.length) {
        return true;
      }

      return currentOrder.some((id, index) => id !== baseOrder[index]);
    },
    [initialOrder, tagGroups],
  );

  const handleToggleEditing = (category: CategoryKey) => {
    setEditingCategory((prev) => (prev === category ? null : category));
    resetDraggingState();
  };

  const handleInputChange = (category: CategoryKey, value: string) => {
    setNewTagInputs((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleResetInput = (category: CategoryKey) => {
    setNewTagInputs((prev) => ({
      ...prev,
      [category]: "",
    }));
  };

  const upsertInitialOrder = useCallback(
    (nextGroups: TagGroupMap, category?: CategoryKey) => {
      setInitialOrder((prev) => {
        if (!category) {
          return extractOrders(nextGroups);
        }

        const updated: OrderMap = {
          ...prev,
          [category]: nextGroups[category].map((tag) => tag.id),
        };

        return updated;
      });
    },
    [],
  );

  const handleCreateTag = async (category: CategoryKey) => {
    if (!user?.id) {
      showToast(t("tagManagement.authRequired"), "error");
      return;
    }

    const inputValue = newTagInputs[category].trim();

    if (!inputValue) {
      showToast(t("pageModal.tagNameRequired"), "error");
      return;
    }

    if (inputValue.length > 20) {
      showToast(t("pageModal.tagNameTooLong"), "error");
      return;
    }

    if (!/^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９]+$/.test(inputValue)) {
      showToast(t("pageModal.tagNameInvalid"), "error");
      return;
    }

    setSubmittingCategory(category);

    try {
      const response = await createTag({
        name: inputValue,
        category: CATEGORY_LABEL_MAP[category],
        user_id: user.id,
      });

      if (response.success && response.data) {
        const newTag = response.data as TagItem;
        setTagGroups((prev) => {
          const nextGroups: TagGroupMap = {
            ...prev,
            [category]: sortTagList([...prev[category], newTag]),
          };
          upsertInitialOrder(nextGroups, category);
          return nextGroups;
        });
        handleResetInput(category);
        showToast(t("pageModal.tagAdded"), "success");
      } else {
        showToast(
          ("error" in response && response.error) ||
            t("pageModal.tagAddFailed"),
          "error",
        );
      }
    } catch (error) {
      console.error("タグ追加エラー:", error);
      showToast(t("pageModal.tagAddFailed"), "error");
    } finally {
      setSubmittingCategory(null);
    }
  };

  const handleDeleteTag = async (category: CategoryKey, tagId: string) => {
    if (!user?.id || deletingTagId) {
      return;
    }

    setDeletingTagId(tagId);

    try {
      const response = await deleteTag(tagId, user.id);

      if (response.success) {
        setTagGroups((prev) => {
          const nextGroups: TagGroupMap = {
            ...prev,
            [category]: prev[category].filter((tag) => tag.id !== tagId),
          };
          upsertInitialOrder(nextGroups, category);
          return nextGroups;
        });
        showToast(t("tagManagement.deleteSuccess"), "success");
      } else {
        showToast(
          ("error" in response && response.error) ||
            t("tagManagement.deleteFailed"),
          "error",
        );
      }
    } catch (error) {
      console.error("タグ削除エラー:", error);
      showToast(t("tagManagement.deleteFailed"), "error");
    } finally {
      setDeletingTagId(null);
    }
  };

  const handleDragStart = (
    category: CategoryKey,
    tagId: string,
    event: DragEvent<HTMLLIElement>,
  ) => {
    if (editingCategory !== category) return;
    setDraggingTagId(tagId);
    setDraggingCategory(category);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  };

  const resetDraggingState = useCallback(() => {
    setDraggingTagId(null);
    setDraggingCategory(null);
    activeTouchIdentifierRef.current = null;
    pendingTouchRef.current = null;
    lastTouchTargetRef.current = null;
  }, []);

  const handleDragEnd = useCallback(() => {
    resetDraggingState();
  }, [resetDraggingState]);

  const reorderWithinCategory = (
    category: CategoryKey,
    fromId: string,
    targetId: string | null,
  ) => {
    setTagGroups((prev) => {
      const currentList = prev[category];
      const fromIndex = currentList.findIndex((tag) => tag.id === fromId);

      if (fromIndex === -1) {
        return prev;
      }

      let toIndex = targetId
        ? currentList.findIndex((tag) => tag.id === targetId)
        : currentList.length - 1;

      if (toIndex === -1) {
        toIndex = currentList.length - 1;
      }

      if (fromIndex === toIndex) {
        return prev;
      }

      const reordered = [...currentList];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      return {
        ...prev,
        [category]: reordered,
      };
    });
    lastTouchTargetRef.current = targetId ?? "__END__";
  };

  const handleDrop = (category: CategoryKey, targetId: string | null) => {
    if (!draggingTagId || draggingCategory !== category) {
      return;
    }

    reorderWithinCategory(category, draggingTagId, targetId);
  };

  const getTouchAt = (
    touches: ReactTouchList,
    index: number,
  ): TouchPoint | null => {
    if (typeof touches.item === "function") {
      const touch = touches.item(index);
      if (touch) {
        return touch;
      }
    }

    const fallback = (touches as unknown as TouchPoint[])[index];
    return fallback ?? null;
  };

  const resolveActiveTouch = (
    event: TouchEvent<HTMLUListElement>,
  ): TouchPoint | null => {
    if (event.touches.length === 0) {
      return null;
    }

    const identifier = activeTouchIdentifierRef.current;
    if (identifier === null) {
      return getTouchAt(event.touches, 0);
    }

    for (let index = 0; index < event.touches.length; index += 1) {
      const candidate = getTouchAt(event.touches, index);
      if (candidate && candidate.identifier === identifier) {
        return candidate;
      }
    }

    return getTouchAt(event.touches, 0);
  };

  const handleTouchStart = (
    category: CategoryKey,
    tagId: string,
    event: TouchEvent<HTMLLIElement>,
  ) => {
    if (editingCategory !== category || event.touches.length === 0) {
      return;
    }

    const touch = getTouchAt(event.touches, 0);
    if (!touch) {
      return;
    }

    activeTouchIdentifierRef.current = touch.identifier;
    pendingTouchRef.current = {
      category,
      tagId,
      startX: touch.clientX,
      startY: touch.clientY,
    };
    lastTouchTargetRef.current = tagId;
  };

  const handleTouchMove = (
    category: CategoryKey,
    event: TouchEvent<HTMLUListElement>,
  ) => {
    if (editingCategory !== category) {
      return;
    }

    if (draggingCategory && draggingCategory !== category) {
      return;
    }

    const activeTouch = resolveActiveTouch(event);
    if (!activeTouch) {
      return;
    }

    let currentDraggingId = draggingTagId;
    const pendingTouch = pendingTouchRef.current;

    if (
      !currentDraggingId &&
      pendingTouch &&
      pendingTouch.category === category
    ) {
      const deltaX = Math.abs(activeTouch.clientX - pendingTouch.startX);
      const deltaY = Math.abs(activeTouch.clientY - pendingTouch.startY);

      if (Math.max(deltaX, deltaY) < DRAG_ACTIVATION_THRESHOLD_PX) {
        return;
      }

      currentDraggingId = pendingTouch.tagId;
      setDraggingTagId(pendingTouch.tagId);
      setDraggingCategory(category);
      pendingTouchRef.current = null;
    }

    if (!currentDraggingId) {
      return;
    }

    event.preventDefault();

    if (typeof document === "undefined") {
      return;
    }

    const element = document.elementFromPoint(
      activeTouch.clientX,
      activeTouch.clientY,
    );
    const tagElement = element?.closest<HTMLLIElement>("[data-tag-id]");

    if (tagElement) {
      const targetId = tagElement.getAttribute("data-tag-id");
      if (
        targetId &&
        targetId !== currentDraggingId &&
        lastTouchTargetRef.current !== targetId
      ) {
        reorderWithinCategory(category, currentDraggingId, targetId);
      }
      return;
    }

    const registeredList = tagListRefs.current[category];
    const listElement = element?.closest<HTMLUListElement>("[data-tag-list]");

    if (registeredList && listElement === registeredList) {
      if (lastTouchTargetRef.current !== "__END__") {
        reorderWithinCategory(category, currentDraggingId, null);
      }
      return;
    }

    if (!registeredList) {
      return;
    }

    const rect = registeredList.getBoundingClientRect();

    if (activeTouch.clientY > rect.bottom) {
      if (lastTouchTargetRef.current !== "__END__") {
        reorderWithinCategory(category, currentDraggingId, null);
      }
      return;
    }

    if (activeTouch.clientY < rect.top) {
      const firstTag =
        registeredList.querySelector<HTMLLIElement>("[data-tag-id]");
      const firstId = firstTag?.getAttribute("data-tag-id");

      if (
        firstId &&
        firstId !== currentDraggingId &&
        lastTouchTargetRef.current !== firstId
      ) {
        reorderWithinCategory(category, currentDraggingId, firstId);
      }
    }
  };

  const handleTouchEnd = (category: CategoryKey) => {
    if (
      draggingCategory === category ||
      pendingTouchRef.current?.category === category
    ) {
      resetDraggingState();
    }
  };

  const handleCancelReorder = (category: CategoryKey) => {
    setTagGroups((prev) => {
      const tagMap = new Map(prev[category].map((tag) => [tag.id, tag]));
      const reordered = initialOrder[category]
        .map((id) => tagMap.get(id))
        .filter(Boolean) as TagItem[];

      return {
        ...prev,
        [category]: reordered,
      };
    });
    resetDraggingState();
  };

  const handleSaveOrder = async (category: CategoryKey) => {
    if (!user?.id || !hasOrderChanged(category)) {
      return;
    }

    const payload: UpdateTagOrderPayload = {
      user_id: user.id,
      tori: tagGroups.tori.map((tag) => tag.id),
      uke: tagGroups.uke.map((tag) => tag.id),
      waza: tagGroups.waza.map((tag) => tag.id),
    };

    setSavingCategory(category);

    try {
      const response = await updateTagOrder(payload);

      if (response.success && Array.isArray(response.data)) {
        const groups = buildGroups(response.data as TagItem[]);
        setTagGroups(groups);
        setInitialOrder(extractOrders(groups));
        setEditingCategory(null);
        showToast(t("tagManagement.orderSaveSuccess"), "success");
      } else {
        showToast(
          ("error" in response && response.error) ||
            t("tagManagement.orderSaveFailed"),
          "error",
        );
      }
    } catch (error) {
      console.error("タグ並び順更新エラー:", error);
      showToast(t("tagManagement.orderSaveFailed"), "error");
    } finally {
      setSavingCategory(null);
      resetDraggingState();
    }
  };

  const isDeleting = useMemo(() => deletingTagId !== null, [deletingTagId]);

  return (
    <MinimalLayout
      headerTitle={t("tagManagement.title")}
      backHref={`/${locale}/personal/pages`}
    >
      <div className={styles.container}>
        {isLoading ? (
          <div className={styles.loaderWrapper}>
            <Loader centered text={t("tagManagement.loading")} />
          </div>
        ) : (
          CATEGORY_KEYS.map((category) => {
            const isEditing = editingCategory === category;
            const tagsForCategory = tagGroups[category];
            const inputValue = newTagInputs[category];
            const isSubmitting = submittingCategory === category;
            const isSaving = savingCategory === category;
            const orderChanged = hasOrderChanged(category);

            return (
              <section key={category} className={styles.card}>
                <div className={styles.categoryHeader}>
                  <h2 className={styles.categoryTitle}>
                    {t(`tagManagement.categories.${category}`)}
                  </h2>
                  <button
                    type="button"
                    className={`${styles.editButton} ${isEditing ? styles.editButtonActive : ""}`}
                    onClick={() => handleToggleEditing(category)}
                    aria-pressed={isEditing}
                    aria-label={t("tagManagement.editAria", {
                      category: t(`tagManagement.categories.${category}`),
                    })}
                  >
                    <EditIcon size={18} aria-hidden="true" />
                  </button>
                </div>

                {isEditing && (
                  <div className={styles.editControls}>
                    <p className={styles.editHint}>
                      {t("tagManagement.reorderHint")}
                    </p>
                    <div className={styles.reorderButtons}>
                      <button
                        type="button"
                        className={styles.orderButtonPrimary}
                        onClick={() => handleSaveOrder(category)}
                        disabled={!orderChanged || isSaving}
                      >
                        {isSaving
                          ? t("tagManagement.orderSaving")
                          : t("tagManagement.saveOrder")}
                      </button>
                      <button
                        type="button"
                        className={styles.orderButtonSecondary}
                        onClick={() => handleCancelReorder(category)}
                        disabled={isSaving}
                      >
                        {t("tagManagement.undo")}
                      </button>
                    </div>
                  </div>
                )}

                <ul
                  className={styles.tagList}
                  data-tag-list={category}
                  ref={(node) => {
                    tagListRefs.current[category] = node;
                  }}
                  onDragOver={(event) => {
                    if (isEditing) {
                      event.preventDefault();
                      if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = "move";
                      }
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (isEditing) {
                      handleDrop(category, null);
                    }
                  }}
                  onTouchMove={(event) => handleTouchMove(category, event)}
                  onTouchEnd={() => handleTouchEnd(category)}
                  onTouchCancel={() => handleTouchEnd(category)}
                >
                  {tagsForCategory.length > 0 ? (
                    tagsForCategory.map((tag) => {
                      const isDragging = draggingTagId === tag.id;
                      const className = [
                        styles.tagItem,
                        isDeleting && deletingTagId === tag.id
                          ? styles.tagItemDeleting
                          : "",
                        isEditing ? styles.tagItemDraggable : "",
                        isDragging ? styles.tagItemDragging : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <li
                          key={tag.id}
                          className={className}
                          draggable={isEditing}
                          data-tag-id={tag.id}
                          onDragStart={(event) =>
                            handleDragStart(category, tag.id, event)
                          }
                          onDragEnd={handleDragEnd}
                          onDragOver={(event) => {
                            if (isEditing) {
                              event.preventDefault();
                              if (event.dataTransfer) {
                                event.dataTransfer.dropEffect = "move";
                              }
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (isEditing) {
                              handleDrop(category, tag.id);
                            }
                          }}
                          onTouchStart={(event) =>
                            handleTouchStart(category, tag.id, event)
                          }
                        >
                          <Tag variant="default">
                            <span>{tag.name}</span>
                            {isEditing && (
                              <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={() =>
                                  handleDeleteTag(category, tag.id)
                                }
                                aria-label={`Delete tag ${tag.name}`}
                              >
                                <span
                                  className={styles.deleteMark}
                                  aria-hidden="true"
                                >
                                  ×
                                </span>
                              </button>
                            )}
                          </Tag>
                        </li>
                      );
                    })
                  ) : (
                    <li className={styles.emptyMessage}>
                      {t("tagManagement.empty")}
                    </li>
                  )}
                </ul>

                <div className={styles.newTagForm}>
                  <input
                    type="text"
                    className={styles.newTagInput}
                    placeholder={t("pageModal.addNewTag")}
                    value={inputValue}
                    onChange={(event) =>
                      handleInputChange(category, event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        handleResetInput(category);
                      }
                    }}
                    maxLength={20}
                    disabled={isSubmitting}
                    aria-label={t("pageModal.addNewTag")}
                  />
                  <button
                    type="button"
                    className={styles.formButtonPrimary}
                    onClick={() => handleCreateTag(category)}
                    disabled={isSubmitting}
                  >
                    {t("pageModal.add")}
                  </button>
                  <button
                    type="button"
                    className={styles.formButtonSecondary}
                    onClick={() => handleResetInput(category)}
                    disabled={isSubmitting}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </section>
            );
          })
        )}
      </div>
    </MinimalLayout>
  );
}
