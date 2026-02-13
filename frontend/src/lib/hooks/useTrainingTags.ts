import { useEffect, useState } from "react";
import { getTags } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

export interface Tag {
  id: string;
  name: string;
  category: string;
}

export function useTrainingTags() {
  const { user } = useAuth();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      if (!user?.id) return;
      try {
        const response = await getTags(user.id);
        if (!response.success) {
          console.error(
            "Failed to fetch tags:",
            "error" in response ? response.error : undefined,
          );
          return;
        }

        if (response.data) {
          setAvailableTags(response.data as Tag[]);
        }
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    };
    fetchTags();
  }, [user]);

  return { availableTags };
}
