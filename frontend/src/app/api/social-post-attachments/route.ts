import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteFileFromS3,
  extractFileKeyFromUrl,
  generatePublicUrl,
} from "@/lib/aws-s3";
import { getServerSupabase } from "@/lib/supabase/server";

const createAttachmentSchema = z.object({
  post_id: z.string().uuid("有効な投稿IDが必要です"),
  type: z.enum(["image", "video", "youtube"], {
    message: "タイプはimage、video、youtubeのいずれかです",
  }),
  file_key: z.string().optional(),
  url: z.string().optional(),
  thumbnail_url: z.string().url().optional().nullable(),
  original_filename: z.string().optional().nullable(),
  file_size_bytes: z.number().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createAttachmentSchema.parse(body);

    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 投稿の所有者チェック
    const { data: post, error: postError } = await supabase
      .from("SocialPost")
      .select("id")
      .eq("id", validatedData.post_id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "投稿が見つからないか、アクセス権限がありません" },
        { status: 403 },
      );
    }

    // URLの決定
    let attachmentUrl: string;

    if (validatedData.type === "youtube") {
      if (!validatedData.url) {
        return NextResponse.json(
          { error: "YouTube URLが必要です" },
          { status: 400 },
        );
      }
      attachmentUrl = validatedData.url;
    } else {
      if (!validatedData.file_key) {
        return NextResponse.json(
          { error: "ファイルキーが必要です" },
          { status: 400 },
        );
      }

      if (!validatedData.file_key.startsWith(`users/${user.id}/`)) {
        return NextResponse.json(
          { error: "無効なファイルキーです" },
          { status: 400 },
        );
      }

      attachmentUrl = generatePublicUrl(validatedData.file_key);
    }

    // sort_order が明示指定されていればそれを使用、なければ現在の最大値+1 を採番
    let nextSortOrder: number;
    if (validatedData.sort_order !== undefined) {
      nextSortOrder = validatedData.sort_order;
    } else {
      const { data: existingAttachments } = await supabase
        .from("SocialPostAttachment")
        .select("sort_order")
        .eq("post_id", validatedData.post_id)
        .order("sort_order", { ascending: false })
        .limit(1);

      nextSortOrder =
        existingAttachments && existingAttachments.length > 0
          ? (existingAttachments[0].sort_order ?? 0) + 1
          : 0;
    }

    const { data: newAttachment, error: insertError } = await supabase
      .from("SocialPostAttachment")
      .insert([
        {
          post_id: validatedData.post_id,
          user_id: user.id,
          type: validatedData.type,
          url: attachmentUrl,
          thumbnail_url: validatedData.thumbnail_url ?? null,
          original_filename: validatedData.original_filename ?? null,
          file_size_bytes: validatedData.file_size_bytes ?? null,
          sort_order: nextSortOrder,
        },
      ])
      .select("*")
      .single();

    if (insertError) {
      console.error("ソーシャル投稿添付作成エラー:", insertError);
      return NextResponse.json(
        { error: "添付ファイルの作成に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: newAttachment,
    });
  } catch (error) {
    console.error("ソーシャル投稿添付作成エラー:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "無効なリクエストデータ", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "サーバー内部エラー" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json(
        { error: "post_idパラメータが必要です" },
        { status: 400 },
      );
    }

    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { data: attachments, error } = await supabase
      .from("SocialPostAttachment")
      .select("*")
      .eq("post_id", postId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("ソーシャル投稿添付取得エラー:", error);
      return NextResponse.json(
        { error: "添付ファイルの取得に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: attachments || [],
    });
  } catch (error) {
    console.error("ソーシャル投稿添付取得エラー:", error);
    return NextResponse.json({ error: "サーバー内部エラー" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("id");

    if (!attachmentId) {
      return NextResponse.json(
        { error: "idパラメータが必要です" },
        { status: 400 },
      );
    }

    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { data: attachment, error: fetchError } = await supabase
      .from("SocialPostAttachment")
      .select("*")
      .eq("id", attachmentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "添付ファイルが見つからないか、削除権限がありません" },
        { status: 404 },
      );
    }

    if (attachment.type !== "youtube" && attachment.url) {
      try {
        const fileKey = extractFileKeyFromUrl(attachment.url);
        if (fileKey?.startsWith(`users/${user.id}/`)) {
          await deleteFileFromS3(fileKey);
        }
      } catch (s3Error) {
        console.warn("S3ファイル削除に失敗しました:", s3Error);
      }
    }

    const { error: deleteError } = await supabase
      .from("SocialPostAttachment")
      .delete()
      .eq("id", attachmentId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("ソーシャル投稿添付削除エラー:", deleteError);
      return NextResponse.json(
        { error: "添付ファイルの削除に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "添付ファイルが正常に削除されました",
    });
  } catch (error) {
    console.error("ソーシャル投稿添付削除エラー:", error);
    return NextResponse.json({ error: "サーバー内部エラー" }, { status: 500 });
  }
}
