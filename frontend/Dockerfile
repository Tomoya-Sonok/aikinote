# Development stage
FROM node:20.11.1-alpine AS development

WORKDIR /app

# フォント関連のパッケージをインストール
RUN apk add --no-cache fontconfig

# 特定バージョンのpnpmをインストール（.mise.tomlと一致させる）
RUN npm install -g pnpm@8.15.4

COPY package.json pnpm-lock.yaml* ./

# pnpmを使用してパッケージをインストール
RUN pnpm install

COPY . .

# 開発サーバーを起動
CMD ["pnpm", "run", "dev"]

# Production stage
FROM node:20.11.1-alpine AS production

WORKDIR /app

# フォント関連のパッケージをインストール
RUN apk add --no-cache fontconfig

# 特定バージョンのpnpmをインストール（.mise.tomlと一致させる）
RUN npm install -g pnpm@8.15.4

COPY package.json pnpm-lock.yaml* ./

# pnpmを使用してパッケージをインストール
RUN pnpm install
RUN ls -l node_modules/@supabase/ssr

# Build arguments for Supabase configuration
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

COPY . .

# 本番環境用ビルド
RUN pnpm run build

# Next.jsの本番サーバーを起動
CMD ["pnpm", "start"]