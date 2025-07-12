# Development stage
FROM node:20.11.1-alpine AS development

WORKDIR /app

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

# 特定バージョンのpnpmをインストール（.mise.tomlと一致させる）
RUN npm install -g pnpm@8.15.4

COPY package.json pnpm-lock.yaml* ./

# pnpmを使用してパッケージをインストール
RUN pnpm install

# Build arguments for Supabase configuration
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY

# Set environment variables for build
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

COPY . .

# 本番環境用ビルド
RUN pnpm run build

# Honoの本番サーバーを起動
CMD ["pnpm", "start"]