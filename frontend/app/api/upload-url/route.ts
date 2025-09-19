import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { generateUploadSignedUrl, validateImageType } from '@/lib/aws-s3'
import { z } from 'zod'

// リクエストボディのバリデーションスキーマ
const uploadUrlSchema = z.object({
  filename: z.string().min(1, 'ファイル名が必要です'),
  contentType: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/, '無効なコンテンツタイプです'),
  fileSize: z.number().max(1024 * 1024, 'ファイルサイズは1MB未満である必要があります'),
})

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの解析と検証
    const body = await request.json()
    const validatedData = uploadUrlSchema.parse(body)
    const { filename, contentType, fileSize } = validatedData

    // Supabaseクライアントの初期化
    const supabase = getServerSupabase()

    // 認証済みユーザーの取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // ファイル形式の検証
    if (!validateImageType(filename)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。jpg、jpeg、png、webpのみ許可されています。' },
        { status: 400 }
      )
    }

    // ファイルサイズの検証（1MB制限）
    if (fileSize > 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは1MB未満である必要があります' },
        { status: 400 }
      )
    }

    // 署名付きURLの生成
    const { uploadUrl, fileKey } = await generateUploadSignedUrl(
      user.id,
      filename,
      contentType
    )

    return NextResponse.json({
      uploadUrl,
      fileKey,
      expiresIn: 15 * 60, // 15分（秒単位）
    })
  } catch (error) {
    console.error('アップロードURL生成エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '無効なリクエストデータ', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'サーバー内部エラー' },
      { status: 500 }
    )
  }
}