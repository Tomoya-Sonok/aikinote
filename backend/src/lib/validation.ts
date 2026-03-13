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
    .min(1, "内容は必須です")
    .max(3000, "内容は3000文字以内で入力してください"),
  comment: z
    .string()
    .max(1000, "その他・コメントは1000文字以内で入力してください")
    .default(""),
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  created_at: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      "created_atはISO 8601形式(YYYY-MM-DDTHH:mm:ss.sssZ)で指定してください",
    )
    .optional(),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;

// ページ更新のバリデーションスキーマ
export const updatePageSchema = z.object({
  id: z.string().min(1, "ページIDは必須です"),
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .max(100, "タイトルは100文字以内で入力してください"),
  tori: z.array(z.string()).default([]),
  uke: z.array(z.string()).default([]),
  waza: z.array(z.string()).default([]),
  content: z
    .string()
    .min(1, "内容は必須です")
    .max(3000, "内容は3000文字以内で入力してください"),
  comment: z
    .string()
    .max(1000, "その他・コメントは1000文字以内で入力してください")
    .default(""),
  user_id: z.string().min(1, "ユーザーIDは必須です"),
});

export type UpdatePageInput = z.infer<typeof updatePageSchema>;

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
const trainingDateStringSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "training_dateはYYYY-MM-DD形式で指定してください",
  );

export const getPagesSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0)),
  query: z.string().optional(),
  tags: z.string().optional(), // "tag1,tag2,tag3" のような形式
  start_date: trainingDateStringSchema.optional(),
  end_date: trainingDateStringSchema.optional(),
  date: z.string().optional(), // "YYYY-MM-DD" の形式
  sort_order: z.enum(["newest", "oldest"]).optional().default("newest"),
});

export type GetPagesInput = z.infer<typeof getPagesSchema>;

// ページ詳細取得のバリデーションスキーマ
export const getPageSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
});

export type GetPageInput = z.infer<typeof getPageSchema>;

// ページ一覧レスポンスの型
export const pagesListResponseSchema = z.object({
  training_pages: z.array(pageWithTagsResponseSchema),
  total_count: z.number().int().min(0),
});

export type PagesListResponse = z.infer<typeof pagesListResponseSchema>;

export const getTrainingDatesSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  year: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1970).max(9999)),
  month: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(12)),
});

export type GetTrainingDatesInput = z.infer<typeof getTrainingDatesSchema>;

export const upsertTrainingDateSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  training_date: trainingDateStringSchema,
});

export type UpsertTrainingDateInput = z.infer<typeof upsertTrainingDateSchema>;

export const deleteTrainingDateSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  training_date: trainingDateStringSchema,
});

export type DeleteTrainingDateInput = z.infer<typeof deleteTrainingDateSchema>;

// 統計データ取得のバリデーションスキーマ
export const getTrainingStatsSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  start_date: trainingDateStringSchema.optional(),
  end_date: trainingDateStringSchema.optional(),
});

export type GetTrainingStatsInput = z.infer<typeof getTrainingStatsSchema>;

// 統計データレスポンスの型
export const tagStatItemSchema = z.object({
  tag_id: z.string(),
  tag_name: z.string(),
  category: z.string(),
  page_count: z.number().int().min(0),
});

export const monthlyStatItemSchema = z.object({
  month: z.string(),
  attended_days: z.number().int().min(0),
  page_count: z.number().int().min(0),
});

export const trainingStatsResponseSchema = z.object({
  training_start_date: z.string().nullable(),
  first_training_date: z.string().nullable(),
  total_attended_days: z.number().int().min(0),
  total_pages: z.number().int().min(0),
  attended_days_in_period: z.number().int().min(0),
  pages_in_period: z.number().int().min(0),
  tag_stats: z.array(tagStatItemSchema),
  monthly_stats: z.array(monthlyStatItemSchema),
});

export type TrainingStatsResponse = z.infer<typeof trainingStatsResponseSchema>;

export const trainingDateResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  training_date: trainingDateStringSchema,
  is_attended: z.boolean(),
  created_at: z.string(),
});

export const trainingDatePageCountSchema = z.object({
  training_date: trainingDateStringSchema,
  page_count: z.number().int().min(0),
});

export const trainingDateMonthResponseSchema = z.object({
  training_dates: z.array(trainingDateResponseSchema),
  page_counts: z.array(trainingDatePageCountSchema),
});

export type TrainingDateResponse = z.infer<typeof trainingDateResponseSchema>;
export type TrainingDatePageCount = z.infer<typeof trainingDatePageCountSchema>;
export type TrainingDateMonthResponse = z.infer<
  typeof trainingDateMonthResponseSchema
>;

// ============================================
// ソーシャル投稿関連バリデーション
// ============================================

// 投稿作成
export const createSocialPostSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  content: z
    .string()
    .min(1, "投稿内容は必須です")
    .max(2000, "投稿内容は2000文字以内で入力してください"),
  post_type: z.enum(["post", "training_record"], {
    errorMap: () => ({ message: "投稿タイプはpostまたはtraining_recordです" }),
  }),
  source_page_id: z.string().uuid().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export type CreateSocialPostInput = z.infer<typeof createSocialPostSchema>;

// 投稿更新
export const updateSocialPostSchema = z.object({
  content: z
    .string()
    .min(1, "投稿内容は必須です")
    .max(2000, "投稿内容は2000文字以内で入力してください")
    .optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export type UpdateSocialPostInput = z.infer<typeof updateSocialPostSchema>;

// フィード取得
export const getSocialPostsSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  tab: z.enum(["all", "training", "favorites"]).optional().default("all"),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0)),
});

export type GetSocialPostsInput = z.infer<typeof getSocialPostsSchema>;

// 返信作成
export const createSocialReplySchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  content: z
    .string()
    .min(1, "返信内容は必須です")
    .max(1000, "返信内容は1000文字以内で入力してください"),
});

export type CreateSocialReplyInput = z.infer<typeof createSocialReplySchema>;

// 返信更新
export const updateSocialReplySchema = z.object({
  content: z
    .string()
    .min(1, "返信内容は必須です")
    .max(1000, "返信内容は1000文字以内で入力してください"),
});

export type UpdateSocialReplyInput = z.infer<typeof updateSocialReplySchema>;

// 通報
export const createReportSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  reason: z.enum(["spam", "harassment", "inappropriate", "other"], {
    errorMap: () => ({ message: "通報理由を選択してください" }),
  }),
  detail: z.string().max(500, "詳細は500文字以内で入力してください").optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

// 投稿検索
export const searchSocialPostsSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  query: z.string().optional(),
  dojo_name: z.string().optional(),
  rank: z.string().optional(),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0)),
});

export type SearchSocialPostsInput = z.infer<typeof searchSocialPostsSchema>;

// 通知取得
export const getNotificationsSchema = z.object({
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0)),
});

export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>;

// 通知既読化
export const markNotificationsReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).optional(),
  mark_all: z.boolean().optional(),
});

export type MarkNotificationsReadInput = z.infer<
  typeof markNotificationsReadSchema
>;
