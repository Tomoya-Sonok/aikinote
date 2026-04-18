import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { extractYouTubeVideoId } from "@/lib/utils/youtube";

interface YouTubeOEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
}

interface OgpResponse {
  title: string;
  thumbnail_url: string;
  video_id: string;
  author_name: string;
}

// YouTube oEmbed APIからメタデータを取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "urlパラメータが必要です" },
        { status: 400 },
      );
    }

    // 認証チェック
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // YouTube URLからビデオIDを抽出
    const videoId = extractYouTubeVideoId(url);

    if (!videoId) {
      return NextResponse.json(
        { error: "有効なYouTube URLではありません" },
        { status: 400 },
      );
    }

    // YouTube oEmbed APIを呼び出し
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

    const oembedResponse = await fetch(oembedUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!oembedResponse.ok) {
      return NextResponse.json(
        { error: "YouTube動画のメタデータ取得に失敗しました" },
        { status: 404 },
      );
    }

    const oembedData: YouTubeOEmbedResponse = await oembedResponse.json();

    const response: OgpResponse = {
      title: oembedData.title,
      thumbnail_url: oembedData.thumbnail_url,
      video_id: videoId,
      author_name: oembedData.author_name,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("OGP取得エラー:", error);
    return NextResponse.json({ error: "サーバー内部エラー" }, { status: 500 });
  }
}
