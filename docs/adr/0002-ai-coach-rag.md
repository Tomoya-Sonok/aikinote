# AIコーチ（RAG）のアーキテクチャと利用制限（#281）

蓄積した稽古記録をソースに回答する AIコーチを、**全件詰め込み型 RAG**（ユーザーの全記録をプロンプトのコンテキストに入れる）＋ Gemini 2.5 Flash Lite で実装する。ストリーミングは **Next.js Route Handler + Vercel AI SDK**（`@ai-sdk/react` の `useChat` ＋ `streamText`）で行い、会話・メッセージ・利用回数は Next の Route Handler から **ユーザーセッションの Supabase（RLS）** で読み書きする（既存の `api/page-attachments` や `api/users` と同じ流儀）。

## Considered Options

- **検索方式**: ベクトル検索(pgvector) ではなく全件詰め込みを採用。個人の稽古日誌は規模が限定的で、「AIコーチが全記録を踏まえて答える」体験を素直に表現できるため。トークン消費は、システム指示＋記録コーパスを安定プレフィックスにして Gemini の暗黙的キャッシュ割引を効かせ、定型プロンプトのボタン化・トークン上限ガード（新しい順に打ち切り）・利用回数制限で抑える。
- **ストリーミングの置き場所**: Hono(Workers) の SSE ではなく Next Route Handler を採用。ブラウザ→Workers の CORS/認証ヘッダー処理を避け、Vercel 上のストリーミング適性と `GEMINI_API_KEY`（サーバー専用環境変数）の取り回しを優先（CLAUDE.md の「API は Hono」方針からの意図的な逸脱）。
- **データアクセス**: Hono(service role) への新規エンドポイント追加ではなく、Next Route Handler から user セッション(RLS)で直接読み書き。`TrainingPage`/`User` は既存の Next API ルートが同様にアクセスしており、追加のバックエンド表面を増やさないため。

## Consequences

- 利用回数: 1メッセージ=1カウント。`User.ai_chat_usage_count` は **Free/Premium 問わず加算**（分析用途）。Free は生涯2件で `PremiumUpgradeModal`、Premium は当日(JST)メッセージ数20件で制限。
- `GEMINI_API_KEY` が未設定の環境では AIコーチは 503 を返す（機能無効）。Vercel への環境変数設定が必要。
- ストリーミング・Gemini 連携は実 API キーが必要なため、CI では型・ビルド・ユニット（利用制限/コンテキスト整形）のみ検証し、E2E は手動確認とする。
