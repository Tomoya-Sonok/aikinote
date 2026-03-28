<div align="center">
    <img width="200" height="200" alt="AikiNote Logo" src="https://github.com/user-attachments/assets/5e6cc759-3f93-48c1-a6e5-1b2c7eb11eae" />
    <h1>AikiNote</h1>
</div>

[![Open in Visual Studio Code](https://img.shields.io/static/v1?logo=visualstudiocode&label=Open&message=in%20Visual%20Studio%20Code&labelColor=2c2c32&color=007acc&logoColor=007acc)](https://open.vscode.dev/Tomoya-Sonok/aikinote)

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Tomoya-Sonok/aikinote/main_ci.yml?branch=main)](https://github.com/Tomoya-Sonok/aikinote/actions)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Tomoya-Sonok/aikinote)](https://github.com/Tomoya-Sonok/aikinote/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/Tomoya-Sonok/aikinote)](https://github.com/Tomoya-Sonok/aikinote/commits/main)
[![GitHub](https://img.shields.io/github/license/Tomoya-Sonok/aikinote)](https://github.com/Tomoya-Sonok/aikinote/blob/main/LICENSE)

<img width="260" height="620" alt="Screenshot 2026-03-28 at 11 35 28-portrait" src="https://github.com/user-attachments/assets/36576ff3-c1a5-4d7a-ac24-410094d49918" />

<img width="260" height="620" alt="Screenshot 2026-03-28 at 11 35 50-portrait" src="https://github.com/user-attachments/assets/c02f1150-b927-49a7-966d-54c6a8cdb8c2" />

<img width="260" height="620" alt="Screenshot 2026-03-28 at 11 36 09-portrait" src="https://github.com/user-attachments/assets/6a2154d5-1941-459f-9fe3-57fe408d2edc" />


## About

(\*English follows Japanese.)

- 日々の合気道の稽古で学んだことや感想を効率的に記録/振り返りできるデジタル稽古日誌アプリ
  - 個人の稽古記録の用途に特化した世代を問わず使いやすいUIやデザイン
  - 異なる流派や他道場生と合気道の技の考察や意見交換を通して交流できるSNS機能を搭載

---

- A digital training journal app designed for Aikido practitioners to freely record, search, and review their daily learnings and reflections from practice sessions.
  - User-friendly UI and design tailored for personal training logs, accessible to all generations and experience levels
  - Includes a social feature that enables interaction and exchange of insights with practitioners from different dojos or styles of Aikido

## Features

(\*English follows Japanese.)

- 多言語対応（日本語 / 英語）
- ひとりで（Personal Mode）
  - アプリ起動後、ワンタップですぐに稽古記録が可能。
  - 相半身/逆半身や◯◯手取りなどの情報は、都度入力する必要はなくタグとして選択するのみでよい。重要な学んだことの振り返りの入力に集中できる。
  - タグやフリーワード、記録日で検索して、効率よく過去の稽古記録を参照・閲覧することができる。
  - 稽古統計をチャートで可視化し、自分の稽古傾向を振り返ることができる。
  - 画像や動画を添付して、技の様子やメモを視覚的に記録できる。
- みんなで（Social Mode）
  - 異なる流派や他道場生と合気道の技の考察や意見交換を通して交流できるSNS機能
  - 投稿の作成・編集・削除、フィード閲覧、返信、お気に入り
  - ハッシュタグやフリーワードでの投稿検索、トレンド表示
  - 通知機能（未読バッジ・既読化）、通報機能
  - 自分の投稿内容の公開範囲をマイページから変更すると、同じ流派（所属道場）のユーザーのみに向けた発信もできる
  - 未ログインユーザーでも公開投稿を閲覧可能
- サブスクリプション（AikiNote Premium）
  - Web版はStripe Checkout、ネイティブ版はRevenueCatによるアプリ内課金に対応

---

- Multilingual support (Japanese / English)
- Personal Mode
  - Quickly log your training session with just one tap after launching the app.
  - No need to type in details like ai-hanmi / gyaku-hanmi or katate-dori—just select them as tags so you can focus on recording what you’ve truly learned.
  - Easily browse and revisit past entries using tags, free-text search, or training dates.
  - Visualize your training statistics with charts to review your practice trends.
  - Attach images or videos to visually document techniques and notes.
- Social Mode
  - A social feature to connect with practitioners from different styles and dojos, allowing thoughtful exchange and discussion of Aikido techniques.
  - Create, edit, and delete posts; browse your feed; reply to and favorite posts.
  - Search posts by hashtags or free-text; view trending topics.
  - Notifications with unread badges, and a reporting system.
  - Adjust the visibility of your posts from your profile page—for example, limit them to users from your own style or dojo.
  - Public posts are viewable even without logging in.
- Subscription (AikiNote Premium)
  - Supports Stripe Checkout for web and RevenueCat in-app purchases for native apps.

## Technology Stack Used

| Category     | Technology Stack                                                                                                                                                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | Next.js 16 (App Router) / React 19 / TypeScript / CSS Modules / next-intl / React Hook Form / Zustand / TanStack Query / tRPC / recharts |
| **Backend**  | Hono (Node.js 22) / TypeScript / Zod / JSON Web Token / Supabase JavaScript SDK / Stripe |
| **Database & Auth** | Supabase (PostgreSQL, Auth, Row Level Security) |
| **Storage & Messaging** | Amazon S3 / CloudFront / Resend / RevenueCat |
| **Infrastructure** | Vercel (Frontend) / Cloudflare Workers (Backend) / Cloudflare DNS |
| **Tooling & Testing** | pnpm Workspaces / Docker & Docker Compose / Vitest / Testing Library / Storybook 9 / MSW / Biome / Husky |

## Setup

### 0. Prerequisites

- **Node.js** 22.22.0
- **pnpm** 8.15.4
- **Docker** and **Docker Compose**
- **Supabase account**
- **AWS account**
- **Resend account**
- **Stripe account** (for subscription features)
- **RevenueCat account** (for native app in-app purchases)
- **Google Cloud Console project** (for Google OAuth)

### 1. Clone the repository

```bash
git clone https://github.com/Tomoya-Sonok/aikinote.git
cd aikinote
```

### 2. Environment setup

Copy the environment template and configure your environment values:

```bash
cp .env.local.example .env.local
```

Edit the root-level `.env.local`. Both the frontend and backend load this file when running locally or via Docker:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key

# App & API endpoints
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_IS_DOCKER=false

# Authentication / security
JWT_SECRET=your_jwt_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AWS S3 / CloudFront (profile images)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
CLOUDFRONT_DOMAIN=your_cloudfront_domain
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=your_cloudfront_domain

# Stripe (subscription)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=your_stripe_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_YEARLY=your_stripe_yearly_price_id

# RevenueCat (native IAP)
NEXT_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_public_key
REVENUECAT_WEBHOOK_TOKEN=your_revenuecat_webhook_token
```

> ⚠️  Please note that you cannot use the profile picture upload and email sending functions without configuring the necessary values for AWS and Resend. Subscription features require Stripe and RevenueCat configuration. Google OAuth requires Google Cloud Console credentials.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Run the development servers

Start both frontend and backend services with Docker (reads `.env.local` automatically):

```bash
docker-compose up
```

> **Note**: If you prefer running them without Docker, open two terminals and run `pnpm --filter backend dev` and `pnpm --filter frontend dev`. Both commands rely on the root `.env.local`.
>
> **Tip**: You can also start both servers from the monorepo root with a single command: `pnpm dev`. To run in the background, use `pnpm dev -- --bg`, and to stop them, run `pnpm dev:stop`.
>
> **Troubleshooting**: If backend startup fails with `EADDRINUSE: ... 8787`, another process is already using port `8787`. Run `pnpm dev:stop` first, and if needed, check with `lsof -i :8787` and stop the listed process before restarting.
>
> **Frontend Stability**: If you intermittently hit Next.js dev cache errors (e.g. `ENOENT` under `.next/dev/...`) while using `pnpm --filter frontend dev`, try `pnpm --filter frontend dev:webpack` as a fallback.
>
> **Production Secrets**: When deploying to Cloudflare Workers, standard environment variables are not automatically uploaded. Run the following command to sync your local secrets to Cloudflare:
> `pnpm wrangler:secret:update`
> This reads keys and values from your root `.env.local` and updates them on Cloudflare using `wrangler secret put`. This process is interactive for each secret but is automated by the script.
>
> **Vercel Frontend Env**: Root `.env.local` and `pnpm wrangler:secret:update` do not update Vercel. For frontend production deployments, set `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `CLOUDFRONT_DOMAIN`, and `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` in Vercel Project Settings for the `Production` environment, then redeploy.

### 5. Access the application

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8787>

That's it! You're ready to start developing. 🚀

## Author

Tomoya Sonokui <<https://github.com/Tomoya-Sonok>>

## License

Distributed under the MIT License. See [LICENSE](./LICENSE.txt) for more information.
