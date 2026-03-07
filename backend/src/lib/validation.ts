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
