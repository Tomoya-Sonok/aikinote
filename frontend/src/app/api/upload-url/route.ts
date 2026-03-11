import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ATTACHMENT_SIZE_LIMITS,
  generateAttachmentUploadSignedUrl,
  generateUploadSignedUrl,
  validateImageType,
  validateMediaType,
} from "@/lib/aws-s3";
import { getServerSupabase } from "@/lib/supabase/server";

// プロフィール画像用バリデーションスキーマ
const profileImageSchema = z.object({
  filename: z.string().min(1, "ファイル名が必要です"),
  contentType: z
    .string()
    .regex(/^image\/(jpeg|jpg|png|webp)$/, "無効なコンテンツタイプです"),
  fileSize: z
    .number()
    .max(5 * 1024 * 1024, "ファイルサイズは5MB未満である必要があります"),
  uploadType: z.literal("profile-image").optional().default("profile-image"),
});

// ページ添付ファイル用バリデーションスキーマ
const pageAttachmentSchema = z.object({
  filename: z.string().min(1, "ファイル名が必要です"),
  contentType: z
    .string()
    .regex(
      /^(image\/(jpeg|jpg|png|webp)|video\/(mp4|quicktime|webm))$/,
      "無効なコンテンツタイプです",
    ),
  fileSize: z
    .number()
    .max(ATTACHMENT_SIZE_LIMITS.video, "ファイルサイズが制限を超えています"),
  uploadType: z.literal("page-attachment"),
});

// リクエスト判定用スキーマ
const uploadTypeDiscriminator = z.object({
  uploadType: z.enum(["profile-image", "page-attachment"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Supabaseクライアントの初期化
    const supabase = await getServerSupabase();

    // 認証済みユーザーの取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // uploadTypeに応じて処理を分岐
    const { uploadType } = uploadTypeDiscriminator.parse(body);

    if (uploadType === "page-attachment") {
      // ---- ページ添付ファイル ----
      const validatedData = pageAttachmentSchema.parse(body);
      const { filename, contentType, fileSize } = validatedData;

      if (!validateMediaType(filename)) {
        return NextResponse.json(
          {
            error:
              "サポートされていないファイル形式です。jpg、jpeg、png、webp、mp4、mov、webmのみ許可されています。",
          },
          { status: 400 },
        );
      }

      const { uploadUrl, fileKey } = await generateAttachmentUploadSignedUrl(
        user.id,
        filename,
        contentType,
        fileSize,
      );

      return NextResponse.json({
        uploadUrl,
        fileKey,
        expiresIn: 15 * 60,
      });
    }

    // ---- プロフィール画像（デフォルト） ----
    const validatedData = profileImageSchema.parse(body);
    const { filename, contentType } = validatedData;

    if (!validateImageType(filename)) {
      return NextResponse.json(
        {
          error:
            "サポートされていないファイル形式です。jpg、jpeg、png、webpのみ許可されています。",
        },
        { status: 400 },
      );
    }

    const { uploadUrl, fileKey } = await generateUploadSignedUrl(
      user.id,
      filename,
      contentType,
    );

    return NextResponse.json({
      uploadUrl,
      fileKey,
      expiresIn: 15 * 60,
    });
  } catch (error) {
    console.error("アップロードURL生成エラー:", error);

    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? "無効なリクエストデータ";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "サーバー内部エラー" }, { status: 500 });
  }
}
