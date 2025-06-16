FROM node:20.11.1-alpine

WORKDIR /app

# 特定バージョンのpnpmをインストール（.mise.tomlと一致させる）
RUN npm install -g pnpm@8.15.4

COPY package.json pnpm-lock.yaml* ./

# pnpmを使用してパッケージをインストール
RUN pnpm install

COPY . .

# Next.jsの開発サーバーを起動
CMD ["pnpm", "run", "dev"]

# 本番環境用ビルド時は以下を使用
# RUN pnpm run build
# CMD ["pnpm", "start"]