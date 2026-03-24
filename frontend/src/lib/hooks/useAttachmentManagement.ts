"use client";

import { useCallback, useRef, useState } from "react";
import type { AttachmentData } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import { createAttachment } from "@/lib/api/client";

type EntityType = "page" | "social-post";

interface UseAttachmentManagementOptions {
  initialAttachments?: AttachmentData[];
}

interface UseAttachmentManagementReturn {
  attachments: AttachmentData[];
  setAttachments: React.Dispatch<React.SetStateAction<AttachmentData[]>>;
  handleAttachmentAdd: (attachment: AttachmentData) => void;
  handleAttachmentDelete: (id: string) => Promise<void>;
  saveNewAttachments: (entityId: string) => Promise<void>;
}

function getDeleteEndpoint(entityType: EntityType): string {
  return entityType === "page"
    ? "/api/page-attachments"
    : "/api/social-post-attachments";
}

export function useAttachmentManagement(
  entityType: EntityType,
  options: UseAttachmentManagementOptions = {},
): UseAttachmentManagementReturn {
  const { initialAttachments = [] } = options;
  const [attachments, setAttachments] =
    useState<AttachmentData[]>(initialAttachments);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const handleAttachmentAdd = useCallback((attachment: AttachmentData) => {
    setAttachments((prev) => [...prev, attachment]);
  }, []);

  const handleAttachmentDelete = useCallback(
    async (id: string) => {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      if (!id.startsWith("temp-")) {
        try {
          await fetch(`${getDeleteEndpoint(entityType)}?id=${id}`, {
            method: "DELETE",
          });
        } catch (err) {
          console.warn("添付の削除に失敗:", err);
        }
      }
    },
    [entityType],
  );

  const saveNewAttachments = useCallback(
    async (entityId: string) => {
      const current = attachmentsRef.current;
      const newAttachments = current.filter((a) => a.id.startsWith("temp-"));
      if (newAttachments.length === 0) return;

      const idField = entityType === "page" ? "page_id" : "post_id";
      const endpoint = getDeleteEndpoint(entityType);

      await Promise.allSettled(
        newAttachments.map((attachment, i) => {
          if (entityType === "page") {
            const payload: Record<string, unknown> = {
              [idField]: entityId,
              type: attachment.type,
              original_filename: attachment.original_filename ?? null,
              file_size_bytes: attachment.file_size_bytes ?? null,
              thumbnail_url: attachment.thumbnail_url ?? null,
            };
            if (attachment.type === "youtube") {
              payload.url = attachment.url;
            } else {
              payload.file_key = attachment._fileKey;
            }
            return createAttachment(payload);
          }
          return fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              [idField]: entityId,
              type: attachment.type,
              file_key:
                attachment.type !== "youtube" ? attachment._fileKey : undefined,
              url: attachment.type === "youtube" ? attachment.url : undefined,
              original_filename: attachment.original_filename ?? null,
              file_size_bytes: attachment.file_size_bytes ?? null,
              sort_order: i,
            }),
          });
        }),
      );
    },
    [entityType],
  );

  return {
    attachments,
    setAttachments,
    handleAttachmentAdd,
    handleAttachmentDelete,
    saveNewAttachments,
  };
}
