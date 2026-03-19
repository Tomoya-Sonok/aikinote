import { useCallback, useEffect, useState } from "react";
import type { AttachmentData } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import { getAttachments, getPage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { TrainingPageData } from "@/types/training";

export function usePageDetailData(pageId: string) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<TrainingPageData | null>(null);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);

  const fetchAttachments = useCallback(async () => {
    if (!pageId) return;
    try {
      const attachJson = await getAttachments(pageId);
      if (attachJson.success && attachJson.data) {
        setAttachments(attachJson.data);
      }
    } catch (attachErr) {
      console.warn("添付一覧の取得に失敗:", attachErr);
    }
  }, [pageId]);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (pageId && user?.id) {
          const response = await getPage(pageId, user.id);

          if (response.success && response.data) {
            const convertedData: TrainingPageData = {
              id: response.data.page.id,
              title: response.data.page.title,
              content: response.data.page.content,
              is_public: response.data.page.is_public ?? false,
              date: response.data.page.created_at,
              tags: response.data.tags.map((tag) => tag.name),
              attachments: response.data.attachments ?? [],
            };
            setPageData(convertedData);

            await fetchAttachments();
          } else {
            setPageData(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch page data:", err);
        setPageData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageId, user?.id, authLoading, fetchAttachments]);

  return {
    loading,
    pageData,
    setPageData,
    attachments,
    fetchAttachments,
  };
}
