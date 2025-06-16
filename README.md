
# AikiNote

(ここにバッジ等を設置する)

TODO: パスの末尾を修正した上でREADME.mdに書き込む
[![Open in Visual Studio Code](https://img.shields.io/static/v1?logo=visualstudiocode&label=&message=Open%20in%20Visual%20Studio%20Code&labelColor=2c2c32&color=007acc&logoColor=007acc)](https://open.vscode.dev/｛GitHubのuser名｝/{リポジトリ名})

## 📖 概要

AikiNoteは合気道の稽古を記録し、技の習得状況を管理できるアプリケーションです。道場やインストラクターとの連携機能も備え、合気道修行者のための総合的な稽古管理プラットフォームを目指しています。

- **稽古記録管理**: 日々の稽古内容を簡単に記録・管理
- **技の習得状況**: 習得した技や上達度を視覚的に確認
- **道場管理**: 所属道場の情報や稽古スケジュールの確認
- **コミュニティ**: 他の修行者との交流や情報共有

## 🛠️ スクリーンショット

<!-- ここにアプリのスクリーンショットを追加 -->

## 💻 技術スタック

| 区分         | 技術スタック                                                                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **フロントエンド** | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![CSS Modules](https://img.shields.io/badge/CSS_Modules-000000?style=for-the-badge&logo=css-modules&logoColor=white) |
| **バックエンド**   | ![Hono.js](https://img.shields.io/badge/Hono.js-E36002?style=for-the-badge&logo=hono&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)                                         |
| **データベース**   | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)                                                                                                            |
| **インフラ**       | ![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white) |

## 🚀 開発環境のセットアップ

### 前提条件

- Docker と Docker Compose がインストールされていること
- Node.js (v18以上)
- pnpm (推奨)

### 環境変数の設定

開発環境では、以下の2種類の環境変数ファイルを使用します：

- `.env` - 公開可能な基本設定（Git管理対象）
- `.env.local` - 秘密情報（Git管理対象外）

必要な環境変数：

```env
# .env - 公開可能な基本設定
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8787

# .env.local - 秘密情報
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 開発環境の起動

Docker Composeを使用して開発環境を一度に起動できます：

```bash
docker-compose up
```

これにより、以下のサービスが起動します：

- フロントエンド: [http://localhost:3000](http://localhost:3000)
- バックエンド: [http://localhost:8787](http://localhost:8787)

コンテナを停止するには：

```bash
docker-compose down
```

### 個別のサービス開発

Docker Composeを使わず、個別にサービスを開発する場合：

#### フロントエンド開発

```bash
cd frontend
pnpm install
pnpm dev
```

#### バックエンド開発

```bash
cd backend
pnpm install
pnpm dev
```

## 📂 プロジェクト構造

```txt
├── docker-compose.yml     # ローカル開発環境の設定
├── README.md
├── backend/               # Hono.jsバックエンド
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   └── index.ts       # APIエントリーポイント
├── frontend/              # Next.jsフロントエンド
│   ├── Dockerfile
│   ├── app/               # App Router
│   │   ├── page.tsx       # ホームページ
│   │   ├── (auth)/        # 認証関連ページグループ
│   │   │   ├── login/     # ログインページ
│   │   │   └── signup/    # サインアップページ
│   │   └── mypage/        # マイページ
│   ├── components/        # 共通コンポーネント
│   ├── lib/               # ユーティリティ
│   │   ├── api.ts         # APIクライアント
│   │   ├── auth.ts        # 認証関連
│   │   └── supabase.ts    # Supabase設定
│   └── public/
│       └── images/
└── infra/                 # Terraformインフラコード
    ├── alb.tf
    ├── ecr.tf
    ├── ecs.tf
    └── ...
```

## 📝 コントリビューション

<!-- コントリビューションに関するガイドラインをここに記載 -->

## 🌟 ロードマップ

<!-- 今後の開発計画や追加予定の機能をここに記載 -->

## 🔒 セキュリティ

<!-- セキュリティに関する情報をここに記載 -->

## 📋 デプロイ方法

### AWS環境へのデプロイ

１. AWSの認証情報を設定

```bash
aws configure
```

２. Terraformを初期化

```bash
cd infra
terraform init
```

３. Terraformプランを確認

```bash
terraform plan -var-file=terraform.tfvars
```

４. インフラをデプロイ

```bash
terraform apply -var-file=terraform.tfvars
```

### コンテナイメージのビルドとプッシュ

１. フロントエンドイメージのビルドとプッシュ

```bash
cd frontend
docker build -t aikinote-frontend:latest .
aws ecr get-login-password | docker login --username AWS --password-stdin <ECR_URL>
docker tag aikinote-frontend:latest <ECR_URL>/aikinote-frontend:latest
docker push <ECR_URL>/aikinote-frontend:latest
```

２. バックエンドイメージのビルドとプッシュ

```bash
cd backend
docker build -t aikinote-backend:latest .
aws ecr get-login-password | docker login --username AWS --password-stdin <ECR_URL>
docker tag aikinote-backend:latest <ECR_URL>/aikinote-backend:latest
docker push <ECR_URL>/aikinote-backend:latest
```

## 📄 ライセンス

[MIT License](./LICENSE.txt)
