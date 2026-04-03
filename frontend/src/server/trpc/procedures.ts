import { z } from "zod";
import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import type { ApiResponse } from "@/types/api";
import { callHonoApi } from "./hono";
import { authenticatedProcedure, publicProcedure } from "./index";

type UserTag = {
  id: string;
  user_id: string;
  category: string;
  name: string;
  created_at: string;
  sort_order?: number | null;
};

type TitleTemplate = {
  id: string;
  user_id: string;
  template_text: string;
  date_format: string | null;
  sort_order: number;
  created_at: string;
};

type Page = {
  id: string;
  title: string;
  content: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type PageTag = {
  id: string;
  name: string;
  category: string;
};

type PageAttachment = {
  id: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
};

type PageWithTags = {
  page: Page;
  tags: PageTag[];
  attachments?: PageAttachment[];
};

type PagesList = {
  training_pages: PageWithTags[];
  total_count: number;
};

type TrainingDate = {
  id: string;
  user_id: string;
  training_date: string;
  is_attended: boolean;
  created_at: string;
};

type TrainingDatePageCount = {
  training_date: string;
  page_count: number;
};

type TrainingDateMonthSummary = {
  training_dates: TrainingDate[];
  page_counts: TrainingDatePageCount[];
};

type UserProfile = {
  id: string;
  email: string;
  username: string;
  profile_image_url: string | null;
  full_name: string | null;
  dojo_style_name: string | null;
  dojo_style_id: string | null;
  training_start_date: string | null;
  bio: string | null;
  publicity_setting: string | null;
  aikido_rank: string | null;
  age_range: string | null;
  gender: string | null;
};

type TagStatItem = {
  tag_id: string;
  tag_name: string;
  category: string;
  page_count: number;
};

type MonthlyStatItem = {
  month: string;
  attended_days: number;
  page_count: number;
};

type TrainingStatsData = {
  training_start_date: string | null;
  first_training_date: string | null;
  total_attended_days: number;
  total_pages: number;
  attended_days_in_period: number;
  pages_in_period: number;
  tag_stats: TagStatItem[];
  monthly_stats: MonthlyStatItem[];
};

type CreatePageInput = {
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  user_id: string;
};

type UpdatePageInput = CreatePageInput & {
  id: string;
};

export const healthProcedure = publicProcedure
  .output(
    z.object({
      ok: z.literal(true),
      message: z.string(),
    }),
  )
  .query(() => {
    return {
      ok: true,
      message: "tRPC route is ready",
    };
  });

export const honoBridgeTodoProcedure = publicProcedure
  .input(
    z.object({
      // TODO: 実運用時に `path` など必要な入力を定義する
      path: z.string(),
    }),
  )
  .query(async ({ input }) => {
    // TODO: ここで Hono API を呼び出し、型付きの出力へ整形する
    // 例: fetch(`${process.env.NEXT_PUBLIC_API_URL}${input.path}`)
    return {
      ok: false as const,
      message: "未実装です。TODO を実装して利用を開始してください。",
      path: input.path,
    };
  });

export const getPagesProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
      query: z.string().optional(),
      tags: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      sortOrder: z.enum(["newest", "oldest"]).optional(),
    }),
  )
  .query(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
    });

    if (input.limit) query.set("limit", String(input.limit));
    if (input.offset) query.set("offset", String(input.offset));
    if (input.query) query.set("query", input.query);
    if (input.tags && input.tags.length > 0)
      query.set("tags", input.tags.join(","));
    if (input.startDate) query.set("start_date", input.startDate);
    if (input.endDate) query.set("end_date", input.endDate);
    if (input.sortOrder) query.set("sort_order", input.sortOrder);

    return callHonoApi<ApiResponse<PagesList>>(
      `/api/pages?${query.toString()}`,
    );
  });

export const getPageProcedure = publicProcedure
  .input(
    z.object({
      pageId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .query(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
    });

    return callHonoApi<ApiResponse<PageWithTags>>(
      `/api/pages/${input.pageId}?${query.toString()}`,
    );
  });

export const createPageProcedure = publicProcedure
  .input(
    z.object({
      title: z.string(),
      tori: z.array(z.string()),
      uke: z.array(z.string()),
      waza: z.array(z.string()),
      content: z.string(),
      user_id: z.string(),
      is_public: z.boolean().optional(),
      created_at: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          "created_atはISO 8601形式(YYYY-MM-DDTHH:mm:ss.sssZ)で指定してください",
        )
        .optional(),
    }),
  )
  .mutation(async ({ input }) => {
    return callHonoApi<ApiResponse<PageWithTags>>("/api/pages", {
      method: "POST",
      body: JSON.stringify(input as CreatePageInput),
    });
  });

export const updatePageProcedure = publicProcedure
  .input(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      tori: z.array(z.string()),
      uke: z.array(z.string()),
      waza: z.array(z.string()),
      content: z.string(),
      user_id: z.string(),
      is_public: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    return callHonoApi<ApiResponse<PageWithTags>>(`/api/pages/${input.id}`, {
      method: "PUT",
      body: JSON.stringify(input as UpdatePageInput),
    });
  });

export type PublicTrainingPage = {
  id: string;
  title: string;
  content: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  User: {
    username: string;
    profile_image_url: string | null;
    dojo_style_name: string | null;
    aikido_rank: string | null;
  };
};

export const getPublicPagesFeedProcedure = publicProcedure
  .input(
    z.object({
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
    }),
  )
  .query(async ({ input }) => {
    const params = new URLSearchParams();
    if (input.limit) params.set("limit", String(input.limit));
    if (input.offset) params.set("offset", String(input.offset));

    return callHonoApi<
      ApiResponse<{ pages: PublicTrainingPage[]; total_count: number }>
    >(`/api/pages/public/feed?${params.toString()}`);
  });

export const deletePageProcedure = publicProcedure
  .input(
    z.object({
      pageId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
    });

    return callHonoApi<ApiResponse<never>>(
      `/api/pages/${input.pageId}?${query.toString()}`,
      {
        method: "DELETE",
      },
    );
  });

export const getTrainingDatesMonthProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      year: z.number().int().min(1970).max(9999),
      month: z.number().int().min(1).max(12),
    }),
  )
  .query(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
      year: String(input.year),
      month: String(input.month),
    });

    return callHonoApi<ApiResponse<TrainingDateMonthSummary>>(
      `/api/training-dates?${query.toString()}`,
    );
  });

export const upsertTrainingDateAttendanceProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      trainingDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で指定してください"),
    }),
  )
  .mutation(async ({ input }) => {
    return callHonoApi<ApiResponse<TrainingDate>>("/api/training-dates", {
      method: "PUT",
      body: JSON.stringify({
        user_id: input.userId,
        training_date: input.trainingDate,
      }),
    });
  });

export const removeTrainingDateAttendanceProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      trainingDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で指定してください"),
    }),
  )
  .mutation(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
      training_date: input.trainingDate,
    });

    return callHonoApi<ApiResponse<never>>(
      `/api/training-dates?${query.toString()}`,
      {
        method: "DELETE",
      },
    );
  });

export const getTagsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .query(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
    });

    return callHonoApi<ApiResponse<UserTag[]>>(`/api/tags?${query.toString()}`);
  });

export const createTagProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1),
      category: z.enum(["取り", "受け", "技"]),
      user_id: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    return callHonoApi<ApiResponse<UserTag>>("/api/tags", {
      method: "POST",
      body: JSON.stringify(input),
    });
  });

export const deleteTagProcedure = publicProcedure
  .input(
    z.object({
      tagId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
    });

    return callHonoApi<ApiResponse<UserTag>>(
      `/api/tags/${input.tagId}?${query.toString()}`,
      {
        method: "DELETE",
      },
    );
  });

export const updateTagOrderProcedure = publicProcedure
  .input(
    z.object({
      user_id: z.string().min(1),
      tori: z.array(z.string()),
      uke: z.array(z.string()),
      waza: z.array(z.string()),
    }),
  )
  .mutation(async ({ input }) => {
    return callHonoApi<ApiResponse<UserTag[]>>("/api/tags/order", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  });

type DojoStyleSearchResult = {
  id: string;
  dojo_name: string;
  dojo_name_kana: string | null;
  is_approved: boolean;
};

type DojoStyleCreateResult = {
  id: string;
  dojo_name: string;
  is_approved: boolean;
};

export const searchDojoStylesProcedure = publicProcedure
  .input(
    z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional(),
    }),
  )
  .query(async ({ input }) => {
    const params = new URLSearchParams({ query: input.query });
    if (input.limit != null) {
      params.set("limit", String(input.limit));
    }
    const query = params;

    return callHonoApi<ApiResponse<DojoStyleSearchResult[]>>(
      `/api/dojo-styles/search?${query.toString()}`,
    );
  });

export const createDojoStyleProcedure = authenticatedProcedure
  .input(
    z.object({
      dojo_name: z.string().min(1).max(100),
      dojo_name_kana: z.string().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<DojoStyleCreateResult>>("/api/dojo-styles", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.authToken}`,
      },
      body: JSON.stringify(input),
    });
  });

export const getUserInfoProcedure = authenticatedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<UserProfile>>(`/api/users/${input.userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ctx.authToken}`,
      },
    });
  });

export const updateUserInfoProcedure = authenticatedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      username: z.string().optional(),
      full_name: z.string().max(50).nullable().optional(),
      dojo_style_name: z.string().nullable().optional(),
      dojo_style_id: z.string().uuid().nullable().optional(),
      training_start_date: z.string().nullable().optional(),
      profile_image_url: z.string().nullable().optional(),
      bio: z.string().max(500).nullable().optional(),
      publicity_setting: z.enum(["public", "closed", "private"]).optional(),
      aikido_rank: z.string().nullable().optional(),
      age_range: z
        .enum(["lt20", "20s", "30s", "40s", "50s", "gt60"])
        .nullable()
        .optional(),
      gender: z
        .enum(["male", "female", "other", "not_specified"])
        .nullable()
        .optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { userId, ...updateData } = input;

    return callHonoApi<ApiResponse<UserProfile>>(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ctx.authToken}`,
      },
      body: JSON.stringify(updateData),
    });
  });

export const checkUsernameProcedure = publicProcedure
  .input(
    z.object({
      username: z.string().min(1),
      excludeUserId: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    const params = new URLSearchParams({ username: input.username });
    if (input.excludeUserId) {
      params.set("excludeUserId", input.excludeUserId);
    }

    return callHonoApi<ApiResponse<{ available: boolean }>>(
      `/api/users/check-username?${params.toString()}`,
    );
  });

export const getPublicityDojosProcedure = authenticatedProcedure
  .input(z.object({ userId: z.string().min(1) }))
  .query(async ({ input, ctx }) => {
    return callHonoApi<
      ApiResponse<{ dojo_style_id: string; dojo_name: string }[]>
    >(`/api/users/${input.userId}/publicity-dojos`, {
      headers: { Authorization: `Bearer ${ctx.authToken}` },
    });
  });

export const updatePublicityDojosProcedure = authenticatedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      dojoStyleIds: z.array(z.string()),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<null>>(
      `/api/users/${input.userId}/publicity-dojos`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
        body: JSON.stringify({ dojo_style_ids: input.dojoStyleIds }),
      },
    );
  });

export const createUserProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      username: z.string().min(1),
      language: z.enum(["ja", "en"]).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    return callHonoApi<
      ApiResponse<{ id: string; email: string; username: string }>
    >("/api/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  });

export const getTrainingStatsProcedure = authenticatedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const query = new URLSearchParams({ user_id: input.userId });
    if (input.startDate) query.set("start_date", input.startDate);
    if (input.endDate) query.set("end_date", input.endDate);

    return callHonoApi<ApiResponse<TrainingStatsData>>(
      `/api/stats?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  });

export const initializeUserTagsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      language: z.enum(["ja", "en"]).default("ja"),
    }),
  )
  .mutation(async ({ input }) => {
    const result = await initializeUserTagsIfNeeded(
      input.userId,
      input.language,
    );
    if (!result.success) {
      throw new Error("初期タグの作成に失敗しました");
    }

    return {
      success: true as const,
      data: result.data || [],
      message: result.message || "初期タグを作成しました",
    };
  });

// ============================================
// ソーシャル投稿関連プロシージャ
// ============================================

type SocialPostAuthor = {
  id: string;
  username: string;
  profile_image_url: string | null;
  aikido_rank: string | null;
};

type SocialPostTag = {
  id: string;
  name: string;
  category: string;
};

type SocialPostAttachment = {
  id: string;
  post_id: string;
  user_id: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
};

type SocialFeedPost = {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  author_dojo_style_id: string | null;
  author_dojo_name: string | null;
  favorite_count?: number;
  reply_count: number;
  source_page_id: string | null;
  created_at: string;
  updated_at: string;
  author: SocialPostAuthor;
  attachments: SocialPostAttachment[];
  tags: SocialPostTag[];
  is_favorited: boolean;
};

type SocialReplyItem = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  favorite_count: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
  };
  is_favorited: boolean;
};

type SocialPostDetail = {
  post: {
    id: string;
    user_id: string;
    content: string;
    post_type: string;
    author_dojo_style_id: string | null;
    author_dojo_name: string | null;
    favorite_count?: number;
    reply_count: number;
    source_page_id: string | null;
    created_at: string;
    updated_at: string;
  };
  attachments: SocialPostAttachment[];
  tags: SocialPostTag[];
  author: SocialPostAuthor;
  replies: SocialReplyItem[];
  is_favorited: boolean;
};

type SocialPostBasic = {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  created_at: string;
  updated_at: string;
};

type SocialReplyBasic = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type NotificationItem = {
  id: string;
  type: string;
  recipient_user_id: string;
  actor_user_id: string;
  post_id: string | null;
  reply_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    profile_image_url: string | null;
  } | null;
  post_preview: string | null;
};

type SocialProfileData = {
  is_restricted: boolean;
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
    full_name: string | null;
    bio: string | null;
    aikido_rank: string | null;
    dojo_style_name: string | null;
  } | null;
  posts: SocialFeedPost[];
  total_favorites?: number;
  total_pages: number;
  public_pages: { id: string; title: string; created_at: string }[];
};

export const getSocialFeedProcedure = authenticatedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      tab: z.enum(["all", "training", "favorites"]).optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
    });
    if (input.tab) query.set("tab", input.tab);
    if (input.limit) query.set("limit", String(input.limit));
    if (input.offset) query.set("offset", String(input.offset));

    return callHonoApi<ApiResponse<SocialFeedPost[]>>(
      `/api/social/posts?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  });

export const getSocialPostByIdProcedure = authenticatedProcedure
  .input(
    z.object({
      postId: z.string().min(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<SocialPostDetail>>(
      `/api/social/posts/${input.postId}`,
      {
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  });

export const getPublicSocialPostByIdProcedure = publicProcedure
  .input(
    z.object({
      postId: z.string().min(1),
    }),
  )
  .query(async ({ input }) => {
    return callHonoApi<ApiResponse<SocialPostDetail>>(
      `/api/social/posts/public/${input.postId}`,
      {},
    );
  });

export const createSocialPostProcedure = authenticatedProcedure
  .input(
    z.object({
      user_id: z.string().min(1),
      content: z.string().min(1).max(2000),
      post_type: z.enum(["post", "training_record"]),
      source_page_id: z.string().uuid().optional(),
      tag_ids: z.array(z.string().uuid()).optional(),
      from_tutorial: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<SocialPostBasic>>("/api/social/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.authToken}` },
      body: JSON.stringify(input),
    });
  });

export const updateSocialPostProcedure = authenticatedProcedure
  .input(
    z.object({
      postId: z.string().min(1),
      content: z.string().min(1).max(2000).optional(),
      tag_ids: z.array(z.string().uuid()).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { postId, ...updateData } = input;
    return callHonoApi<ApiResponse<SocialPostBasic>>(
      `/api/social/posts/${postId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
        body: JSON.stringify(updateData),
      },
    );
  });

export const removeSocialPostProcedure = authenticatedProcedure
  .input(
    z.object({
      postId: z.string().min(1),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<never>>(
      `/api/social/posts/${input.postId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  });

export const createSocialReplyProcedure = authenticatedProcedure
  .input(
    z.object({
      postId: z.string().min(1),
      user_id: z.string().min(1),
      content: z.string().min(1).max(1000),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { postId, ...body } = input;
    return callHonoApi<ApiResponse<SocialReplyBasic>>(
      `/api/social/posts/${postId}/replies`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
        body: JSON.stringify(body),
      },
    );
  });

export const updateSocialReplyProcedure = authenticatedProcedure
  .input(
    z.object({
      postId: z.string().min(1),
      replyId: z.string().min(1),
      content: z.string().min(1).max(1000),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { postId, replyId, ...body } = input;
    return callHonoApi<ApiResponse<SocialReplyBasic>>(
      `/api/social/posts/${postId}/replies/${replyId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
        body: JSON.stringify(body),
      },
    );
  });

export const removeSocialReplyProcedure = authenticatedProcedure
  .input(
    z.object({
      postId: z.string().min(1),
      replyId: z.string().min(1),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<never>>(
      `/api/social/posts/${input.postId}/replies/${input.replyId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  });

export const toggleFavoriteProcedure = authenticatedProcedure
  .input(
    z.object({
      postId: z.string().min(1),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<
      ApiResponse<{ is_favorited: boolean; favorite_count?: number }>
    >(`/api/social/favorites/${input.postId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.authToken}` },
    });
  });

export const reportPostProcedure = authenticatedProcedure
  .input(
    z.object({
      postId: z.string().min(1),
      user_id: z.string().min(1),
      reason: z.enum([
        "spam",
        "harassment",
        "inappropriate",
        "impersonation",
        "other",
      ]),
      detail: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { postId, ...body } = input;
    return callHonoApi<ApiResponse<unknown>>(
      `/api/social/reports/posts/${postId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
        body: JSON.stringify(body),
      },
    );
  });

export const reportReplyProcedure = authenticatedProcedure
  .input(
    z.object({
      replyId: z.string().min(1),
      user_id: z.string().min(1),
      reason: z.enum([
        "spam",
        "harassment",
        "inappropriate",
        "impersonation",
        "other",
      ]),
      detail: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { replyId, ...body } = input;
    return callHonoApi<ApiResponse<unknown>>(
      `/api/social/reports/replies/${replyId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
        body: JSON.stringify(body),
      },
    );
  });

export const toggleReplyFavoriteProcedure = authenticatedProcedure
  .input(
    z.object({
      replyId: z.string().min(1),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<
      ApiResponse<{ is_favorited: boolean; favorite_count: number }>
    >(`/api/social/favorites/reply/${input.replyId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.authToken}` },
    });
  });

export const searchSocialPostsProcedure = authenticatedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      query: z.string().optional(),
      dojoName: z.string().optional(),
      rank: z.string().optional(),
      hashtag: z.string().optional(),
      postType: z.enum(["post", "training_record"]).optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const params = new URLSearchParams({
      user_id: input.userId,
    });
    if (input.query) params.set("query", input.query);
    if (input.dojoName) params.set("dojo_name", input.dojoName);
    if (input.rank) params.set("rank", input.rank);
    if (input.hashtag) params.set("hashtag", input.hashtag);
    if (input.postType) params.set("post_type", input.postType);
    if (input.limit) params.set("limit", String(input.limit));
    if (input.offset) params.set("offset", String(input.offset));

    return callHonoApi<ApiResponse<SocialFeedPost[]>>(
      `/api/social/search?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  });

export const getTrendingHashtagsProcedure = authenticatedProcedure
  .input(
    z
      .object({
        limit: z.number().int().min(1).max(20).optional(),
      })
      .optional(),
  )
  .query(async ({ input, ctx }) => {
    const params = new URLSearchParams();
    if (input?.limit) params.set("limit", String(input.limit));

    const queryString = params.toString();
    const url = queryString
      ? `/api/social/search/trending?${queryString}`
      : "/api/social/search/trending";

    return callHonoApi<ApiResponse<{ name: string; count: number }[]>>(url, {
      headers: { Authorization: `Bearer ${ctx.authToken}` },
    });
  });

export const getSocialProfileProcedure = authenticatedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<SocialProfileData>>(
      `/api/social/profile/${input.userId}`,
      {
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  });

export const getNotificationsProcedure = authenticatedProcedure
  .input(
    z.object({
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const params = new URLSearchParams();
    if (input.limit) params.set("limit", String(input.limit));
    if (input.offset) params.set("offset", String(input.offset));

    const queryString = params.toString();
    const path = queryString
      ? `/api/social/notifications?${queryString}`
      : "/api/social/notifications";

    return callHonoApi<ApiResponse<NotificationItem[]>>(path, {
      headers: { Authorization: `Bearer ${ctx.authToken}` },
    });
  });

export const markNotificationsReadProcedure = authenticatedProcedure
  .input(
    z.object({
      notificationIds: z.array(z.string().uuid()).optional(),
      markAll: z.boolean().optional(),
      postId: z.string().uuid().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<never>>("/api/social/notifications/read", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${ctx.authToken}` },
      body: JSON.stringify({
        notification_ids: input.notificationIds,
        mark_all: input.markAll,
        post_id: input.postId,
      }),
    });
  });

export const getUnreadNotificationCountProcedure = authenticatedProcedure.query(
  async ({ ctx }) => {
    return callHonoApi<ApiResponse<{ count: number }>>(
      "/api/social/notifications/unread-count",
      {
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  },
);

export const getUnreadNotificationPostIdsProcedure =
  authenticatedProcedure.query(async ({ ctx }) => {
    return callHonoApi<ApiResponse<{ post_ids: string[] }>>(
      "/api/social/notifications/unread-post-ids",
      {
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  });

// ======== サブスクリプション ========

export type SubscriptionStatusData = {
  tier: "free" | "premium";
  status: "active" | "canceled" | "expired" | "billing_issue" | "inactive";
  is_premium: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export const getSubscriptionStatusProcedure = authenticatedProcedure.query(
  async ({ ctx }) => {
    return callHonoApi<ApiResponse<SubscriptionStatusData>>(
      "/api/subscription/status",
      {
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  },
);

export const createCheckoutSessionProcedure = authenticatedProcedure
  .input(z.object({ priceId: z.string().min(1), locale: z.string().min(1) }))
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<{ url: string }>>(
      "/api/subscription/checkout",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
        body: JSON.stringify({
          priceId: input.priceId,
          locale: input.locale,
        }),
      },
    );
  });

export const createPortalSessionProcedure = authenticatedProcedure
  .input(z.object({ locale: z.string().min(1) }))
  .mutation(async ({ input, ctx }) => {
    return callHonoApi<ApiResponse<{ url: string }>>(
      "/api/subscription/portal",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
        body: JSON.stringify({ locale: input.locale }),
      },
    );
  });

export const syncSubscriptionProcedure = authenticatedProcedure.mutation(
  async ({ ctx }) => {
    return callHonoApi<ApiResponse<{ tier: string; status: string }>>(
      "/api/subscription/sync",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.authToken}` },
      },
    );
  },
);

// ============================================================
// タイトルテンプレート
// ============================================================

export const getTitleTemplatesProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .query(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
    });

    return callHonoApi<ApiResponse<TitleTemplate[]>>(
      `/api/title-templates?${query.toString()}`,
    );
  });

export const createTitleTemplateProcedure = publicProcedure
  .input(
    z.object({
      user_id: z.string().min(1),
      template_text: z.string().min(1).max(35),
      date_format: z
        .enum(["yyyy-MM-dd", "yyyy/MM/dd", "yyyy.MM.dd", "yyyyMMdd"])
        .nullable()
        .optional()
        .default(null),
    }),
  )
  .mutation(async ({ input }) => {
    return callHonoApi<ApiResponse<TitleTemplate>>("/api/title-templates", {
      method: "POST",
      body: JSON.stringify(input),
    });
  });

export const deleteTitleTemplateProcedure = publicProcedure
  .input(
    z.object({
      templateId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const query = new URLSearchParams({
      user_id: input.userId,
    });

    return callHonoApi<ApiResponse<TitleTemplate>>(
      `/api/title-templates/${input.templateId}?${query.toString()}`,
      {
        method: "DELETE",
      },
    );
  });
