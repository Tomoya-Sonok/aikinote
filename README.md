<div align="center">
    <img width="200" height="200" alt="AikiNote Logo" src="https://github.com/user-attachments/assets/5e6cc759-3f93-48c1-a6e5-1b2c7eb11eae" />
    <h1>AikiNote</h1>
</div>

[![Open in Visual Studio Code](https://img.shields.io/static/v1?logo=visualstudiocode&label=Open&message=in%20Visual%20Studio%20Code&labelColor=2c2c32&color=007acc&logoColor=007acc)](https://open.vscode.dev/Tomoya-Sonok/aikinote)

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Tomoya-Sonok/aikinote/main_ci.yml?branch=main)](https://github.com/Tomoya-Sonok/aikinote/actions)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Tomoya-Sonok/aikinote)](https://github.com/Tomoya-Sonok/aikinote/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/Tomoya-Sonok/aikinote)](https://github.com/Tomoya-Sonok/aikinote/commits/main)
[![GitHub](https://img.shields.io/github/license/Tomoya-Sonok/aikinote)](https://github.com/Tomoya-Sonok/aikinote/blob/main/LICENSE)


<img width="300" height="647" alt="Screenshot 2025-09-22 at 14 57 15-portrait" src="https://github.com/user-attachments/assets/2b79fd6f-5a91-4957-bd9f-151b963ed94c" />

<img width="300" height="647" alt="Screenshot 2025-09-22 at 16 40 53-portrait" src="https://github.com/user-attachments/assets/7be119dd-cce5-4811-a7d4-557327807839" />



<img width="300" height="647" alt="Screenshot 2025-09-22 at 16 32 45-portrait" src="https://github.com/user-attachments/assets/6803f562-4845-42fe-96d2-df7e26486e8b" />

<img width="300" height="647" alt="Screenshot 2025-09-22 at 16 43 47-portrait" src="https://github.com/user-attachments/assets/6be727d9-1061-456e-8923-eef6748373f5" />

## About

(\*English follows Japanese.)

- 日々の合気道の稽古で学んだことや感想を効率的に記録/振り返りできるデジタル稽古日誌アプリ
  - 個人の稽古記録の用途に特化した世代を問わず使いやすいUIやデザイン
  - 異なる流派や他道場生と合気道の技の考察や意見交換を通して交流できる機能も初期リリース以降で実装予定

---

- A digital training journal app designed for Aikido practitioners to freely record, search, and review their daily learnings and reflections from practice sessions.
  - User-friendly UI and design tailored for personal training logs, accessible to all generations and experience levels
  - Future updates will include features that enable interaction and exchange of insights with practitioners from different dojos or styles of Aikido

## Features

(\*English follows Japanese.)

- 多言語対応（日本語 / 英語）
- ひとりで
  - アプリ起動後、ワンタップですぐに稽古記録が可能。
  - 相半身/逆半身や◯◯手取りなどの情報は、都度入力する必要はなくタグとして選択するのみでよい。重要な学んだことの振り返りの入力に集中できる。
  - タグやフリーワード、記録日で検索して、効率よく過去の稽古記録を参照・閲覧することができる。
- みんなで（**初期リリースには含めず、後発で実装・追加予定**）
  - 異なる流派や他道場生と合気道の技の考察や意見交換を通して交流できるSNS機能
  - 自分の投稿内容の公開範囲をマイページから変更すると、同じ流派（所属道場）のユーザーのみに向けた発信もできる

---

- Multilingual support (Japanese / English)
- Personal Mode
  - Quickly log your training session with just one tap after launching the app.
  - No need to type in details like ai-hanmi / gyaku-hanmi or katate-dori—just select them as tags so you can focus on recording what you’ve truly learned.
  - Easily browse and revisit past entries using tags, free-text search, or training dates.
- Social Mode (**Coming in future updates**)
  - A social feature to connect with practitioners from different styles and dojos, allowing thoughtful exchange and discussion of Aikido techniques.
  - You can adjust the visibility of your posts from your profile page—for example, limit them to users from your own style or dojo.

## Technology Stack Used

| Category     | Technology Stack                                                                                                                                                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | Next.js 14 (App Router) / React 18 / TypeScript / CSS Modules / next-intl / React Hook Form / Zustand |
| **Backend**  | Hono (Node.js 20) / TypeScript / Zod / JSON Web Token / Supabase JavaScript SDK |
| **Database & Auth** | Supabase (PostgreSQL, Auth, Row Level Security) |
| **Storage & Messaging** | Amazon S3 / CloudFront / Resend |
| **Infrastructure** | AWS ECS Fargate / Application Load Balancer / Elastic Container Registry / AWS Systems Manager Parameter Store / CloudWatch Logs / Terraform |
| **Tooling & Testing** | pnpm Workspaces / Docker & Docker Compose / Vitest / Testing Library / Storybook / MSW / Biome |

## Setup

### 0. Prerequisites

- **Node.js** 20.11.1
- **pnpm** 8.15.4
- **Docker** and **Docker Compose**
- **Supabase account** 
- **AWS account**
- **Resend account**

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

# App & API endpoints
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_IS_DOCKER=false

# Authentication / security
JWT_SECRET=your_jwt_secret_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AWS S3 / CloudFront (profile images)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
CLOUDFRONT_DOMAIN=your_cloudfront_domain
```

> ⚠️  Please note that you cannot use the profile picture upload and email sending functions without configuring the necessary values for AWS and Resend.

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

### 5. Access the application

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8787>

That's it! You're ready to start developing. 🚀

## Author

Tomoya Sonokui <<https://github.com/Tomoya-Sonok>>

## License

Distributed under the MIT License. See [LICENSE](./LICENSE.txt) for more information.
