import { NextRequest, NextResponse } from "next/server";

import { initializeUserTagsIfNeeded } from "@/lib/server/tag";


export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "ユーザーIDが必要です" },
        { status: 400 },
      );
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
