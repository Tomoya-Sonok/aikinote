import { NextRequest, NextResponse } from "next/server";
import { INITIAL_USER_TAGS } from "@/constants/tags";
import { initializeUserTagsIfNeeded } from "@/lib/server/tag";

// 開発環境用のモックデータ
const MOCK_USER_ID = "ec40977c-1de8-4784-ac78-e3ff3a5cb915";

const isDevelopment = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "ユーザーIDが必要です" },
        { status: 400 },
      );
    }

    // 開発環境でモックユーザーの場合はモックデータで処理
    if (isDevelopment && user_id === MOCK_USER_ID) {
      const newUserTags = INITIAL_USER_TAGS.map((template, index) => ({
        id: `mock-initial-tag-${index + 1}`,
        user_id: user_id,
        category: template.category,
        name: template.name,
        created_at: new Date().toISOString(),
      }));

      return NextResponse.json({
        success: true,
        data: newUserTags,
        message: "初期タグを作成しました",
      });
    }

    const result = await initializeUserTagsIfNeeded(user_id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "初期タグの作成に失敗しました" },
      { status: 500 },
    );
  }
}
