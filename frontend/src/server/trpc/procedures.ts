import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { initializeUserTagsIfNeeded } from "@/lib/server/tag";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import { callHonoApi } from "./hono";
import { publicProcedure } from "./index";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";


type UserTag = {
  id: string;
  user_id: string;
  category: string;
  name: string;
  created_at: string;
  sort_order?: number | null;
};

type Page = {
  id: string;
  title: string;
  content: string;
  comment: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type PageTag = {
  id: string;
  name: string;
  category: string;
};

type PageWithTags = {
  page: Page;
  tags: PageTag[];
};

type PagesList = {
  training_pages: PageWithTags[];
};

type UserProfile = {
  id: string;
  email: string;
  username: string;
  profile_image_url: string | null;
  dojo_style_name: string | null;
  training_start_date: string | null;
};

type CreatePageInput = {
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  comment: string;
  user_id: string;
};

type UpdatePageInput = CreatePageInput & {
  id: string;
};

const createBackendAuthToken = async () => {
  const serverSupabase = await getServerSupabase();
  const {
    data: { session },
  } = await serverSupabase.auth.getSession();

  if (!session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "認証が必要です",
    });
  }

  return jwt.sign(
    {
      userId: session.user.id,
      email: session.user.email ?? "",
    },
    JWT_SECRET,
    {
      expiresIn: "24h",
    },
  );
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
      date: z.string().optional(),
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
    if (input.date) query.set("date", input.date);

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
      comment: z.string(),
      user_id: z.string(),
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
      comment: z.string(),
      user_id: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    return callHonoApi<ApiResponse<PageWithTags>>(`/api/pages/${input.id}`, {
      method: "PUT",
      body: JSON.stringify(input as UpdatePageInput),
    });
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

export const getUserProfileProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .query(async ({ input }) => {
    const token = await createBackendAuthToken();
    return callHonoApi<ApiResponse<UserProfile>>(`/api/users/${input.userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  });

export const updateUserProfileProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
      username: z.string().optional(),
      dojo_style_name: z.string().nullable().optional(),
      training_start_date: z.string().nullable().optional(),
      profile_image_url: z.string().nullable().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const token = await createBackendAuthToken();
    const { userId, ...updateData } = input;

    return callHonoApi<ApiResponse<UserProfile>>(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });
  });

export const createUserProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      username: z.string().min(1),
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

export const initializeUserTagsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const result = await initializeUserTagsIfNeeded(input.userId);
    if (!result.success) {
      throw new Error("初期タグの作成に失敗しました");
    }

    return {
      success: true as const,
      data: result.data || [],
      message: result.message || "初期タグを作成しました",
    };
  });
