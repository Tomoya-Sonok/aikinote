import { useQuery } from "@tanstack/react-query";
import { getTags } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

export interface Tag {
  id: string;
  name: string;
  category: string;
}

export const trainingTagsQueryKey = (userId: string | undefined) =>
  ["training-tags", userId] as const;

export function useTrainingTags() {
  const { user } = useAuth();

  const query = useQuery<Tag[], Error>({
    queryKey: trainingTagsQueryKey(user?.id),
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await getTags(user.id);
      if (!response.success) {
        const error = "error" in response ? response.error : undefined;
        console.error("Failed to fetch tags:", error);
        return [];
      }
      return (response.data ?? []) as Tag[];
    },
  });

  return { availableTags: query.data ?? [] };
}
