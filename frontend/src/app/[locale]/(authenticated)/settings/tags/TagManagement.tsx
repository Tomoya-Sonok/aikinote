"use client";

import { PencilSimple, Trash, X } from "@phosphor-icons/react";
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
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { Loader } from "@/components/shared/Loader/Loader";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { Tag } from "@/components/shared/Tag/Tag";
import { useToast } from "@/contexts/ToastContext";
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  getCategories,
  getTags,
  type UpdateTagOrderPayload,
  updateCategory,
  updateTagOrder,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { UserCategory } from "@/types/category";
import styles from "./TagManagement.module.css";

const MAX_CATEGORIES = 5;

interface TagItem {
  id: string;
  name: string;
  category: string;
  user_id: string;
  created_at: string;
  sort_order: number | null;
}

type TagGroupMap = Record<string, TagItem[]>;
type OrderMap = Record<string, string[]>;

const DRAG_ACTIVATION_THRESHOLD_PX = 6;
type ReactTouchList = TouchEvent<HTMLUListElement>["touches"];
type TouchPoint = {
  identifier: number;
  clientX: number;
  clientY: number;
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

const buildGroups = (
  items: TagItem[],
  categoryNames: string[],
): TagGroupMap => {
  const groups: TagGroupMap = {};
  for (const name of categoryNames) {
    groups[name] = [];
  }

  for (const tag of items) {
    if (!groups[tag.category]) {
      groups[tag.category] = [];
    }
    groups[tag.category].push(tag);
  }

  for (const key of Object.keys(groups)) {
    groups[key] = sortTagList(groups[key]);
  }

  return groups;
};

const extractOrders = (groups: TagGroupMap): OrderMap => {
  const orders: OrderMap = {};
  for (const [key, tags] of Object.entries(groups)) {
    orders[key] = tags.map((tag) => tag.id);
  }
  return orders;
};

interface TagManagementProps {
  locale: string;
}

export function TagManagement({ locale }: TagManagementProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroupMap>({});
  const [initialOrder, setInitialOrder] = useState<OrderMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [submittingCategory, setSubmittingCategory] = useState<string | null>(
    null,
  );
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);

  // カテゴリ追加
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // カテゴリ編集
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editCategoryInput, setEditCategoryInput] = useState("");

  // カテゴリ削除
  const [deleteCategoryTarget, setDeleteCategoryTarget] =
    useState<UserCategory | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const tagListRefs = useRef<Record<string, HTMLUListElement | null>>({});
  const activeTouchIdentifierRef = useRef<number | null>(null);
  const pendingTouchRef = useRef<{
    category: string;
    tagId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const lastTouchTargetRef = useRef<string | "__END__" | null>(null);

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [categoriesResponse, tagsResponse] = await Promise.all([
        getCategories(user.id),
        getTags(user.id),
      ]);

      let catNames: string[] = [];
      if (
        categoriesResponse?.success &&
        "data" in categoriesResponse &&
        categoriesResponse.data
      ) {
        setCategories(categoriesResponse.data);
        catNames = categoriesResponse.data.map((c) => c.name);
      }

      if (
        tagsResponse.success &&
        "data" in tagsResponse &&
        Array.isArray(tagsResponse.data)
      ) {
        const groups = buildGroups(tagsResponse.data as TagItem[], catNames);
        setTagGroups(groups);
        setInitialOrder(extractOrders(groups));
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
      showToast(t("tagManagement.fetchFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t, user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const hasOrderChanged = useCallback(
    (category: string) => {
      const currentOrder = (tagGroups[category] ?? []).map((tag) => tag.id);
      const baseOrder = initialOrder[category] ?? [];

      if (currentOrder.length !== baseOrder.length) {
        return true;
      }

      return currentOrder.some((id, index) => id !== baseOrder[index]);
    },
    [initialOrder, tagGroups],
  );

  const handleInputChange = (category: string, value: string) => {
    setNewTagInputs((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleResetInput = (category: string) => {
    setNewTagInputs((prev) => ({
      ...prev,
      [category]: "",
    }));
  };

  const upsertInitialOrder = useCallback(
    (nextGroups: TagGroupMap, category?: string) => {
      setInitialOrder((prev) => {
        if (!category) {
          return extractOrders(nextGroups);
        }

        return {
          ...prev,
          [category]: (nextGroups[category] ?? []).map((tag) => tag.id),
        };
      });
    },
    [],
  );

  const handleCreateTag = async (category: string) => {
    if (!user?.id) {
      showToast(t("tagManagement.authRequired"), "error");
      return;
    }

    const inputValue = (newTagInputs[category] ?? "").trim();

    if (!inputValue) {
      showToast(t("pageModal.tagNameRequired"), "error");
      return;
    }

    if (inputValue.length > 20) {
      showToast(t("pageModal.tagNameTooLong"), "error");
      return;
    }

    if (!/^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９\- ]+$/.test(inputValue)) {
      showToast(t("pageModal.tagNameInvalid"), "error");
      return;
    }

    setSubmittingCategory(category);

    try {
      const response = await createTag({
        name: inputValue,
        category,
        user_id: user.id,
      });

      if (response.success && response.data) {
        const newTag = response.data as TagItem;
        setTagGroups((prev) => {
          const nextGroups: TagGroupMap = {
            ...prev,
            [category]: sortTagList([...(prev[category] ?? []), newTag]),
          };
          upsertInitialOrder(nextGroups, category);
          return nextGroups;
        });
        handleResetInput(category);
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

  const handleDeleteTag = async (category: string, tagId: string) => {
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
            [category]: (prev[category] ?? []).filter(
              (tag) => tag.id !== tagId,
            ),
          };
          upsertInitialOrder(nextGroups, category);
          return nextGroups;
        });
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

  // ドラッグ&ドロップ
  const handleDragStart = (
    category: string,
    tagId: string,
    event: DragEvent<HTMLLIElement>,
  ) => {
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
    category: string,
    fromId: string,
    targetId: string | null,
  ) => {
    setTagGroups((prev) => {
      const currentList = prev[category] ?? [];
      const fromIndex = currentList.findIndex((tag) => tag.id === fromId);

      if (fromIndex === -1) return prev;

      let toIndex = targetId
        ? currentList.findIndex((tag) => tag.id === targetId)
        : currentList.length - 1;

      if (toIndex === -1) toIndex = currentList.length - 1;
      if (fromIndex === toIndex) return prev;

      const reordered = [...currentList];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      return { ...prev, [category]: reordered };
    });
    lastTouchTargetRef.current = targetId ?? "__END__";
  };

  const handleDrop = (category: string, targetId: string | null) => {
    if (!draggingTagId || draggingCategory !== category) return;
    reorderWithinCategory(category, draggingTagId, targetId);
  };

  const getTouchAt = (
    touches: ReactTouchList,
    index: number,
  ): TouchPoint | null => {
    if (typeof touches.item === "function") {
      const touch = touches.item(index);
      if (touch) return touch;
    }
    const fallback = (touches as unknown as TouchPoint[])[index];
    return fallback ?? null;
  };

  const resolveActiveTouch = (
    event: TouchEvent<HTMLUListElement>,
  ): TouchPoint | null => {
    if (event.touches.length === 0) return null;
    const identifier = activeTouchIdentifierRef.current;
    if (identifier === null) return getTouchAt(event.touches, 0);
    for (let index = 0; index < event.touches.length; index += 1) {
      const candidate = getTouchAt(event.touches, index);
      if (candidate && candidate.identifier === identifier) return candidate;
    }
    return getTouchAt(event.touches, 0);
  };

  const handleTouchStart = (
    category: string,
    tagId: string,
    event: TouchEvent<HTMLLIElement>,
  ) => {
    if (event.touches.length === 0) return;
    const touch = getTouchAt(event.touches, 0);
    if (!touch) return;
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
    category: string,
    event: TouchEvent<HTMLUListElement>,
  ) => {
    if (draggingCategory && draggingCategory !== category) return;
    const activeTouch = resolveActiveTouch(event);
    if (!activeTouch) return;

    let currentDraggingId = draggingTagId;
    const pendingTouch = pendingTouchRef.current;

    if (
      !currentDraggingId &&
      pendingTouch &&
      pendingTouch.category === category
    ) {
      const deltaX = Math.abs(activeTouch.clientX - pendingTouch.startX);
      const deltaY = Math.abs(activeTouch.clientY - pendingTouch.startY);
      if (Math.max(deltaX, deltaY) < DRAG_ACTIVATION_THRESHOLD_PX) return;
      currentDraggingId = pendingTouch.tagId;
      setDraggingTagId(pendingTouch.tagId);
      setDraggingCategory(category);
      pendingTouchRef.current = null;
    }

    if (!currentDraggingId) return;
    event.preventDefault();
    if (typeof document === "undefined") return;

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

    if (!registeredList) return;
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

  const handleTouchEnd = (category: string) => {
    if (
      draggingCategory === category ||
      pendingTouchRef.current?.category === category
    ) {
      resetDraggingState();
    }
  };

  const handleSaveOrder = async (category: string) => {
    if (!user?.id || !hasOrderChanged(category)) return;

    const payload: UpdateTagOrderPayload = {
      user_id: user.id,
      categories: Object.fromEntries(
        Object.entries(tagGroups).map(([cat, tags]) => [
          cat,
          tags.map((tag) => tag.id),
        ]),
      ),
    };

    setSavingCategory(category);

    try {
      const response = await updateTagOrder(payload);

      if (response.success && Array.isArray(response.data)) {
        const groups = buildGroups(response.data as TagItem[], categoryNames);
        setTagGroups(groups);
        setInitialOrder(extractOrders(groups));
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

  // カテゴリ操作
  const handleCreateCategory = async () => {
    if (!user?.id) return;
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 10) {
      showToast(t("tagManagement.categoryNameTooLong"), "error");
      return;
    }

    setIsCreatingCategory(true);
    try {
      const response = await createCategory({
        name: trimmed,
        user_id: user.id,
      });
      if (response.success && response.data) {
        setCategories((prev) => [...prev, response.data as UserCategory]);
        setTagGroups((prev) => ({
          ...prev,
          [(response.data as UserCategory).name]: [],
        }));
        setInitialOrder((prev) => ({
          ...prev,
          [(response.data as UserCategory).name]: [],
        }));
        setNewCategoryInput("");
        showToast(t("tagManagement.categoryCreateSuccess"), "success");
      } else {
        showToast(
          ("error" in response && response.error) ||
            t("tagManagement.categoryCreateFailed"),
          "error",
        );
      }
    } catch (error) {
      console.error("カテゴリ作成エラー:", error);
      showToast(
        error instanceof Error
          ? error.message
          : t("tagManagement.categoryCreateFailed"),
        "error",
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: UserCategory) => {
    setEditingCategoryId(cat.id);
    setEditCategoryInput(cat.name);
  };

  const handleSaveEditCategory = async () => {
    if (!user?.id || !editingCategoryId) return;
    const trimmed = editCategoryInput.trim();
    if (!trimmed || trimmed.length > 10) return;

    try {
      const response = await updateCategory(editingCategoryId, user.id, {
        name: trimmed,
      });
      if (response.success) {
        await fetchData();
        showToast(t("tagManagement.categoryUpdateSuccess"), "success");
      } else {
        showToast(
          ("error" in response && response.error) ||
            t("tagManagement.categoryUpdateFailed"),
          "error",
        );
      }
    } catch (error) {
      console.error("カテゴリ更新エラー:", error);
      showToast(
        error instanceof Error
          ? error.message
          : t("tagManagement.categoryUpdateFailed"),
        "error",
      );
    } finally {
      setEditingCategoryId(null);
      setEditCategoryInput("");
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!user?.id || !deleteCategoryTarget) return;

    setIsDeletingCategory(true);
    try {
      const response = await deleteCategory(deleteCategoryTarget.id, user.id);
      if (response.success) {
        await fetchData();
        showToast(t("tagManagement.categoryDeleteSuccess"), "success");
      } else {
        showToast(
          ("error" in response && response.error) ||
            t("tagManagement.categoryDeleteFailed"),
          "error",
        );
      }
    } catch (error) {
      console.error("カテゴリ削除エラー:", error);
      showToast(t("tagManagement.categoryDeleteFailed"), "error");
    } finally {
      setIsDeletingCategory(false);
      setDeleteCategoryTarget(null);
    }
  };

  const isDeleting = useMemo(() => deletingTagId !== null, [deletingTagId]);

  const remainingCategories = MAX_CATEGORIES - categories.length;

  return (
    <MinimalLayout
      headerTitle={t("tagManagement.title")}
      backHref={`/${locale}/personal/pages`}
    >
      <div className={styles.container}>
        <p className={styles.description}>{t("tagManagement.reorderHint")}</p>
        {isLoading ? (
          <div className={styles.loaderWrapper}>
            <Loader centered size="large" text={t("tagManagement.loading")} />
          </div>
        ) : (
          <>
            {categories.map((cat) => {
              const tagsForCategory = tagGroups[cat.name] ?? [];
              const inputValue = newTagInputs[cat.name] ?? "";
              const isSubmitting = submittingCategory === cat.name;
              const isSaving = savingCategory === cat.name;
              const orderChanged = hasOrderChanged(cat.name);
              const isEditing = editingCategoryId === cat.id;

              return (
                <section key={cat.id} className={styles.card}>
                  <div className={styles.categoryHeader}>
                    {isEditing ? (
                      <div className={styles.categoryEditForm}>
                        <input
                          type="text"
                          className={styles.categoryEditInput}
                          value={editCategoryInput}
                          onChange={(e) => setEditCategoryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingCategoryId(null);
                              setEditCategoryInput("");
                            }
                          }}
                          maxLength={10}
                        />
                        <Button
                          variant="cancel"
                          size="small"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setEditCategoryInput("");
                          }}
                        >
                          {t("tagFilterModal.cancel")}
                        </Button>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={handleSaveEditCategory}
                          disabled={!editCategoryInput.trim()}
                        >
                          {t("tagManagement.saveOrder")}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h2 className={styles.categoryTitle}>
                          {cat.is_default
                            ? t(`tagManagement.categories.${cat.slug}`)
                            : cat.name}
                        </h2>
                        <div className={styles.categoryActions}>
                          <button
                            type="button"
                            className={styles.categoryEditButton}
                            onClick={() => handleStartEditCategory(cat)}
                            aria-label={`Edit category ${cat.name}`}
                          >
                            <PencilSimple size={16} />
                          </button>
                          <button
                            type="button"
                            className={styles.categoryDeleteButton}
                            onClick={() => setDeleteCategoryTarget(cat)}
                            aria-label={`Delete category ${cat.name}`}
                          >
                            <Trash size={16} color="var(--error-color)" />
                          </button>
                          <div className={styles.reorderButtons}>
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => handleSaveOrder(cat.name)}
                              disabled={!orderChanged || isSaving}
                            >
                              {isSaving
                                ? t("tagManagement.orderSaving")
                                : t("tagManagement.saveOrder")}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <ul
                    className={styles.tagList}
                    data-tag-list={cat.name}
                    ref={(node) => {
                      tagListRefs.current[cat.name] = node;
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDrop(cat.name, null);
                    }}
                    onTouchMove={(event) => handleTouchMove(cat.name, event)}
                    onTouchEnd={() => handleTouchEnd(cat.name)}
                    onTouchCancel={() => handleTouchEnd(cat.name)}
                  >
                    {tagsForCategory.length > 0 ? (
                      tagsForCategory.map((tag) => {
                        const isDragging = draggingTagId === tag.id;
                        const className = [
                          styles.tagItem,
                          isDeleting && deletingTagId === tag.id
                            ? styles.tagItemDeleting
                            : "",
                          styles.tagItemDraggable,
                          isDragging ? styles.tagItemDragging : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <li
                            key={tag.id}
                            className={className}
                            draggable
                            data-tag-id={tag.id}
                            onDragStart={(event) =>
                              handleDragStart(cat.name, tag.id, event)
                            }
                            onDragEnd={handleDragEnd}
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (event.dataTransfer) {
                                event.dataTransfer.dropEffect = "move";
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleDrop(cat.name, tag.id);
                            }}
                            onTouchStart={(event) =>
                              handleTouchStart(cat.name, tag.id, event)
                            }
                          >
                            <Tag variant="default">
                              <span>{tag.name}</span>
                              <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={() =>
                                  handleDeleteTag(cat.name, tag.id)
                                }
                                aria-label={`Delete tag ${tag.name}`}
                              >
                                <X
                                  size={12}
                                  weight="bold"
                                  color="var(--white)"
                                  aria-hidden="true"
                                />
                              </button>
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
                        handleInputChange(cat.name, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          handleResetInput(cat.name);
                        }
                      }}
                      maxLength={20}
                      disabled={isSubmitting}
                      aria-label={t("pageModal.addNewTag")}
                    />
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleCreateTag(cat.name)}
                      disabled={isSubmitting || !inputValue.trim()}
                    >
                      {t("pageModal.add")}
                    </Button>
                  </div>
                </section>
              );
            })}

            {/* カテゴリ追加セクション */}
            <div className={styles.addCategorySection}>
              <div className={styles.addCategoryForm}>
                <input
                  type="text"
                  className={styles.addCategoryInput}
                  placeholder={t("tagManagement.categoryNamePlaceholder")}
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setNewCategoryInput("");
                  }}
                  maxLength={10}
                  disabled={isCreatingCategory || remainingCategories <= 0}
                />
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleCreateCategory}
                  disabled={
                    isCreatingCategory ||
                    !newCategoryInput.trim() ||
                    remainingCategories <= 0
                  }
                >
                  {t("tagManagement.addCategory")}
                </Button>
              </div>
              <p
                className={
                  remainingCategories <= 0
                    ? styles.addCategoryHintError
                    : styles.addCategoryHint
                }
              >
                {remainingCategories > 0
                  ? t("tagManagement.categoryLimit", {
                      max: MAX_CATEGORIES,
                      remaining: remainingCategories,
                    })
                  : t("tagManagement.categoryLimitReached", {
                      max: MAX_CATEGORIES,
                    })}
              </p>
            </div>
          </>
        )}
      </div>

      {/* カテゴリ削除確認ダイアログ */}
      {deleteCategoryTarget && (
        <ConfirmDialog
          isOpen={!!deleteCategoryTarget}
          title={t("tagManagement.categoryDeleteConfirmTitle")}
          message={t("tagManagement.categoryDeleteConfirm", {
            name: deleteCategoryTarget.name,
          })}
          confirmLabel={t("tagManagement.categoryDeleteConfirmButton")}
          cancelLabel={t("tagFilterModal.cancel")}
          onConfirm={handleConfirmDeleteCategory}
          onCancel={() => setDeleteCategoryTarget(null)}
          isProcessing={isDeletingCategory}
        />
      )}
    </MinimalLayout>
  );
}
