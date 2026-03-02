import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// YouTube URL パターン
const YOUTUBE_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

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

// YouTube URLからビデオIDを抽出
function extractYouTubeVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
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
