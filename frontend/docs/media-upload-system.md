# メディアアップロードシステム仕様書

AikiNoteにおけるプロフィール画像およびページ添付ファイル（画像・動画・YouTube）のアップロード・配信システムの完全ガイド

## 📋 システム概要

### アーキテクチャ
```
ユーザー → Next.js API → AWS S3 → CloudFront → 表示
              ↘           ↗
            Supabase DB

YouTube URL → /api/ogp → oEmbed API → プレビューカード表示
```

### 使用技術
- **フロントエンド**: Next.js (App Router)
- **認証**: Supabase Auth
- **データベース**: Supabase (PostgreSQL)
- **ストレージ**: AWS S3
- **CDN**: AWS CloudFront

---

## 🔄 アップロードフロー

### 共通フロー: 署名付きURL方式

1. クライアントが `/api/upload-url` にPOSTリクエスト
2. サーバーが認証チェック + バリデーション後、S3の署名付きURLを生成
3. クライアントがS3に直接PUTアップロード（XHRで進捗追跡）
4. アップロード完了後、CloudFront URLでファイルにアクセス可能

### プロフィール画像アップロード

**場所**: `components/features/user-info/profile-image-upload.tsx`

```
POST /api/upload-url
  → uploadType: "profile-image"（デフォルト）
  → S3パス: users/{userId}/avatar-{uuid}.{ext}
  → 制限: 画像のみ (jpg/jpeg/png/webp), 5MB未満

PUT S3署名付きURL
  → タグ: public=true
  → メタデータ: upload-type: "profile-image"

POST /api/profile-image
  → fileKey を受け取り、DBにCloudFront URLを保存
  → 古い画像をS3から自動削除
```

### ページ添付アップロード

**場所**: `components/features/personal/AttachmentUpload/AttachmentUpload.tsx`

```
POST /api/upload-url
  → uploadType: "page-attachment"
  → S3パス: users/{userId}/page-attachments/{uuid}.{ext}
  → 制限: 画像 5MB / 動画 (mp4/mov/webm) 300MB

PUT S3署名付きURL
  → タグ: public=true
  → メタデータ: upload-type: "page-attachment"

POST /api/page-attachments
  → page_id, file_key, type を受け取り、PageAttachment テーブルに保存
```

### YouTube URL添付

```
GET /api/ogp?url={youtubeUrl}
  → YouTube oEmbed APIからタイトル・サムネイル・ビデオIDを取得
  → レスポンス: { title, thumbnail_url, video_id, author_name }

POST /api/page-attachments
  → type: "youtube", url: YouTubeのURL, thumbnail_url をDBに保存
```

---

## 🗃️ データベース設計

### User テーブル（既存）
- `profile_image_url`: CloudFront URL

### PageAttachment テーブル（新規）
```sql
CREATE TABLE PageAttachment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES "TrainingPage"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "User"(id),
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'youtube')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename TEXT,
  file_size_bytes BIGINT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- **CASCADE削除**: ページ削除時に添付も自動削除
- **RLS有効**: ユーザーは自分の添付のみ操作可能

---

## 🏗️ AWS S3 & CloudFront設定

### S3バケット
- **バケット名**: `AWS_S3_BUCKET_NAME` 環境変数で設定
- **リージョン**: `ap-northeast-1`

### フォルダ構成
```
YOUR_BUCKET_NAME/
├── users/{userId}/
│   ├── avatar-{uuid}.{ext}           # プロフィール画像
│   └── page-attachments/{uuid}.{ext}  # ページ添付
```

### アクセス制御
- `public=true` タグ付きオブジェクトのみCloudFront経由でアクセス可能
- 直接S3アクセスは拒否（プライベートバケット）
- CloudFront Distribution: 環境ごとに設定
- ドメイン: `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` / `CLOUDFRONT_DOMAIN` 環境変数で設定

---

## 🔐 セキュリティ仕様

### 認証・認可
| 操作 | 認証 | 認可チェック |
|---|---|---|
| ファイルアップロード | Supabase Auth必須 | `users/{userId}/` パスで制限 |
| 添付作成 | Supabase Auth必須 | ページ所有者チェック |
| 添付削除 | Supabase Auth必須 | 添付所有者チェック + S3削除 |
| YouTube OGP取得 | Supabase Auth必須 | - |

### ファイル制限
| タイプ | 形式 | サイズ上限 |
|---|---|---|
| プロフィール画像 | JPG, JPEG, PNG, WebP | 5MB |
| ページ添付（画像） | JPG, JPEG, PNG, WebP | 5MB |
| ページ添付（動画） | MP4, MOV, WebM | 300MB |

---

## 🛠️ 実装ファイル一覧

### 共通ユーティリティ
```
frontend/src/lib/aws-s3.ts              # S3操作ユーティリティ（プロフィール + 添付）
```

### プロフィール画像
```
frontend/src/app/api/upload-url/route.ts            # 署名付きURL生成API（共用）
frontend/src/app/api/profile-image/route.ts         # プロフィール画像更新API
frontend/src/components/features/user-info/        # プロフィール画像コンポーネント
```

### ページ添付
```
frontend/src/app/api/page-attachments/route.ts      # 添付CRUD API
frontend/src/app/api/ogp/route.ts                   # YouTube OGP取得API
frontend/src/components/features/personal/
├── AttachmentUpload/                               # アップロードUI
├── AttachmentCard/                                 # プレビューカード
├── MediaPlayer/                                    # 動画/YouTube/画像再生
├── PageModal/                                      # ページ作成/編集モーダル（添付統合済み）
├── PageCreateModal/                                # ページ作成モーダル
└── PageEditModal/                                  # ページ編集モーダル
```

### バックエンド
```
backend/src/lib/supabase.ts                         # DB操作関数（添付CRUD含む）
```

### データベースマイグレーション
```
backend/src/migrations/
├── 001_create_dojo_style_master.sql               # 道場マスタ + User拡張
└── 002_create_social_tables.sql                   # ソーシャルテーブル群
```

※ PageAttachmentテーブルはSupabaseダッシュボードで直接作成済み。

---

## 🚨 トラブルシューティング

### 添付が表示されない
1. S3に `public=true` タグが付いているか確認
2. CloudFront URLを使用しているか確認
3. RLSポリシーが正しく設定されているか確認

### アップロードに失敗する
1. ファイルサイズ制限を確認（画像5MB、動画300MB）
2. ファイル形式を確認
3. 認証トークンが有効か確認

### デバッグコマンド
```bash
# S3オブジェクトのタグ確認
aws s3api get-object-tagging \
  --bucket $AWS_S3_BUCKET_NAME \
  --key "users/xxx/page-attachments/xxx.mp4"

# CloudFrontキャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/users/*/page-attachments/*"
```
