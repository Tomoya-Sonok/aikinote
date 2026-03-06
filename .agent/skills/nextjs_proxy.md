---
name: nextjs_middleware_conventions
description: Next.js 14+ (App Router) における Middleware 使用時のルールと慣習
---

# Next.js Middleware の規約 (App Router)

リクエストやレスポンスをグローバルに変更する場合（認証、i18n、リダイレクトなど）、**Middleware** を使用する必要があります。

## 1. ファイル名と配置場所 (厳格)

- **ファイル名**: 必ず `proxy.ts` (または `.js`) という名前である必要があります。
- **配置場所**: プロジェクトの **ルート** (または `src/` ディレクトリを使用している場合はその直下) に配置する必要があります。
    - ✅ `src/proxy.ts`
    - ✅ `proxy.ts` (srcディレクトリがない場合)
    - ❌ `src/middleware.ts` (Deprecated: Next.js 16 で非推奨となり、警告が表示されます)

**古い規約である `middleware.ts` を使用すると、サーバー起動時に "The 'middleware' file convention is deprecated. Please use 'proxy' instead." という警告が表示されます。**

## 2. 基本構造

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 内部で await を使用する場合は async にできます
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

// 詳細は以下の "Matching Paths" を参照
export const config = {
  matcher: '/about/:path*',
}
```

## 3. 一般的な統合パターン

### Middleware でのデータ取得
Middleware は Edge Runtime 上で動作します。Node.js API は使用できず、データベースへの直接接続もできません。
- 外部 API を呼び出すには `fetch` を使用してください。
- 認証には `@supabase/ssr` などの互換性のあるクライアントを使用してください。

### Supabase Auth パターン
Supabase Auth を使用する場合、セッショントークンをリフレッシュするために Middleware が **必須** です。

```typescript
// src/proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Cookie を管理するためのクライアントを作成
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // リクエスト/レスポンスの Cookie を更新して同期
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
            // ... set と同様の削除ロジック
        },
      },
    }
  )

  // 重要: これにより期限切れのセッションがリフレッシュされます！
  await supabase.auth.getSession()

  return response
}
```
