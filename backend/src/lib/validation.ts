import { z } from "zod";

// ページ作成のバリデーションスキーマ
export const createPageSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .max(100, "タイトルは100文字以内で入力してください"),
  tori: z.array(z.string()).default([]),
  uke: z.array(z.string()).default([]),
  waza: z.array(z.string()).default([]),
  content: z
    .string()
    .min(1, "稽古内容は必須です")
    .max(2000, "稽古内容は2000文字以内で入力してください"),
  comment: z
    .string()
    .max(1000, "コメントは1000文字以内で入力してください")
    .default(""),
  user_id: z.string().min(1, "ユーザーIDは必須です"),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;

// ページレスポンスの型（実際のDB設計に合わせて修正）
export const pageResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  comment: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// タグ情報を含むページレスポンスの型
export const pageWithTagsResponseSchema = z.object({
  page: pageResponseSchema,
  tags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
    }),
  ),
});

export type PageResponse = z.infer<typeof pageResponseSchema>;
export type PageWithTagsResponse = z.infer<typeof pageWithTagsResponseSchema>;

// API レスポンスの共通型
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// ページ一覧取得のバリデーションスキーマ
export const getPagesSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(1).max(100)),
});

export type GetPagesInput = z.infer<typeof getPagesSchema>;

// ページ一覧レスポンスの型
export const pagesListResponseSchema = z.object({
  training_pages: z.array(pageWithTagsResponseSchema),
});

export type PagesListResponse = z.infer<typeof pagesListResponseSchema>;
