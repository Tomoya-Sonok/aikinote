# ログイン・認証フロー仕様書

AikiNoteにおけるユーザー認証・ログインシステムの完全ガイド

## 📋 システム概要

### アーキテクチャ
```
ユーザー → Next.js → Supabase Auth → JWT トークン → Hono API
         ↘️              ↗️                ↘️
           Middleware    認証DB            バックエンド認証
```

### 使用技術
- **フロントエンド認証**: Supabase Auth
- **認証データベース**: Supabase Auth Schema
- **ユーザーデータ**: Supabase Public Schema (`User`テーブル)
- **セッション管理**: Supabase SSR
- **API認証**: JWT (JSON Web Token)
- **バックエンド**: Hono + JWT検証

---

## 🔐 認証システムの構成

### Supabase Auth設定
- **プロバイダー**: Email/Password + Google OAuth
- **JWT Secret**: 環境変数で管理
- **セッション**: ブラウザのHTTPOnly Cookie

### データベース構造
```sql
-- Supabase Auth Schema (自動管理)
auth.users
├── id (UUID)
├── email
├── encrypted_password
├── email_confirmed_at
└── created_at

-- Public Schema (手動管理)
public.User
├── id (UUID) -- auth.users.idと連携
├── email
├── username
├── profile_image_url
├── dojo_style_name
├── training_start_date
└── created_at
```

---

## 🔄 ログインフロー

### 1. ログインページアクセス
**場所**: `app/login/page.tsx`
```tsx
// 既にログイン済みの場合はリダイレクト
const user = await getCurrentUser();
if (user) {
  redirect("/mypage");
}
```

### 2. ログインフォーム入力
**場所**: `app/login/LoginClient.tsx`
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
};
```

### 3. Supabase認証処理
**API**: Supabase Auth API
```typescript
// 内部処理
POST https://csgwevwdzqbosznmxhzg.supabase.co/auth/v1/token?grant_type=password

// リクエスト
{
  "email": "user@example.com",
  "password": "password123"
}

// レスポンス
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "email_confirmed_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. セッション確立
**場所**: Supabase SSR
```typescript
// Cookie設定（自動）
Set-Cookie: sb-csgwevwdzqbosznmxhzg-auth-token=eyJhbGciOiJIUzI1NiIs...; HttpOnly; Secure; SameSite=Lax
```

### 5. ユーザープロフィール確認
**場所**: `lib/server/auth.ts`
```typescript
export async function getUserProfile(userId: string) {
  const supabase = getServiceRoleSupabase();
  return await supabase
    .from("User")
    .select("*")
    .eq("id", userId)
    .single();
}
```

### 6. リダイレクト処理
```typescript
// ログイン成功後
if (data.user) {
  router.push("/mypage");
}
```

---

## 🚪 Google OAuth ログインフロー

### 1. Googleログインボタンクリック
**場所**: `app/login/LoginClient.tsx`
```tsx
const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
};
```

### 2. Google認証画面
```
https://accounts.google.com/oauth/authorize?
  client_id=810763412176-78suv1u6qhb4pqr6ntv6l5gb3pig2iet.apps.googleusercontent.com
  &redirect_uri=https://csgwevwdzqbosznmxhzg.supabase.co/auth/v1/callback
  &response_type=code
  &scope=openid email profile
```

### 3. コールバック処理
**場所**: `app/auth/callback/route.ts`
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createServerClient(/* ... */);
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/mypage", request.url));
}
```

### 4. 新規ユーザーの場合
**自動処理**: Supabase Trigger
```sql
-- Database Function (自動実行)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (id, email, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger設定
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 🔒 認証状態管理

### サーバーサイド認証確認
**場所**: `lib/server/auth.ts`
```typescript
export async function getCurrentUser() {
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
```

### クライアントサイド認証確認
**場所**: `lib/supabase/client.ts`
```typescript
export function getClientSupabase() {
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

// 使用例
const supabase = getClientSupabase();
const { data: { user } } = await supabase.auth.getUser();
```

### Middleware認証チェック
**場所**: `middleware.ts`
```typescript
export async function middleware(request: NextRequest) {
  const { supabase, response } = createServerClient(/* ... */);

  await supabase.auth.getUser();

  // 認証が必要なページの場合
  if (protectedPaths.includes(pathname) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
```

---

## 🎯 API認証フロー（Backend連携）

### 1. JWTトークン取得
**API**: `POST /api/auth/token`
**場所**: `app/api/auth/token/route.ts`

```typescript
export async function POST() {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = generateToken({
    userId: user.id,
    email: user.email || "",
  });

  return NextResponse.json({
    success: true,
    data: { token }
  });
}
```

### 2. JWT生成
**場所**: `lib/jwt.ts`
```typescript
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}
```

### 3. Backend API呼び出し
**場所**: `app/profile/edit/ProfileEditClient.tsx`
```typescript
// JWTトークンを取得
const tokenResponse = await fetch("/api/auth/token", {
  method: "POST",
});
const tokenData = await tokenResponse.json();
const token = tokenData.data.token;

// HonoAPIを呼び出し
const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(updatedData),
});
```

### 4. Backend JWT検証
**場所**: `backend/src/lib/jwt.ts`
```typescript
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    throw new Error("Invalid token");
  }
}
```

### 5. Hono API認証チェック
**場所**: `backend/src/routes/users.ts`
```typescript
app.put("/:userId", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = extractTokenFromHeader(authHeader);
  const payload = verifyToken(token);

  // 本人確認
  if (payload.userId !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // 処理続行...
});
```

---

## 🚪 ログアウトフロー

### 1. ログアウトボタンクリック
**場所**: `components/Header.tsx`
```tsx
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    router.push("/login");
  }
};
```

### 2. Supabaseセッション削除
```typescript
// 内部処理
POST https://csgwevwdzqbosznmxhzg.supabase.co/auth/v1/logout

// Cookie削除
Set-Cookie: sb-csgwevwdzqbosznmxhzg-auth-token=; Max-Age=0
```

### 3. クライアント状態リセット
```typescript
// 自動的にuser状態がnullに更新
const { data: { user } } = await supabase.auth.getUser(); // null
```

---

## 🛡️ セキュリティ仕様

### パスワードポリシー
- **最小長**: 6文字以上（Supabase設定）
- **強度チェック**: フロントエンドでバリデーション
- **ハッシュ化**: Supabase自動処理（bcrypt）

### セッション管理
- **有効期限**: 1時間（access_token）
- **リフレッシュ**: 自動更新（refresh_token: 30日）
- **保存場所**: HttpOnly Cookie（XSS対策）

### JWT仕様
- **アルゴリズム**: HS256
- **有効期限**: 24時間
- **用途**: Backend API認証のみ

### CORS設定
```typescript
// Next.js CORS（自動設定）
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
```

---

## 📱 認証状態による画面制御

### 公開ページ（認証不要）
- `/` - トップページ
- `/login` - ログインページ
- `/signup` - サインアップページ

### 保護されたページ（認証必要）
- `/mypage` - マイページ
- `/profile/edit` - プロフィール編集
- その他ユーザー専用機能

### 認証状態による自動リダイレクト
```typescript
// middleware.ts
const protectedPaths = ["/mypage", "/profile"];
const authPaths = ["/login", "/signup"];

if (protectedPaths.includes(pathname) && !user) {
  return NextResponse.redirect(new URL("/login", request.url));
}

if (authPaths.includes(pathname) && user) {
  return NextResponse.redirect(new URL("/mypage", request.url));
}
```

---

## 🛠️ 実装ファイル一覧

### フロントエンド認証
```
frontend/
├── lib/supabase/
│   ├── client.ts                      # クライアントサイドSupabase
│   └── server.ts                      # サーバーサイドSupabase
├── lib/server/auth.ts                 # 認証ヘルパー関数
├── app/login/
│   ├── page.tsx                       # ログインページ
│   └── LoginClient.tsx                # ログインフォーム
├── app/auth/callback/route.ts         # OAuth コールバック
├── app/api/auth/token/route.ts        # JWT生成API
├── middleware.ts                      # 認証ミドルウェア
└── components/Header.tsx              # ログアウト機能
```

### バックエンド認証
```
backend/
├── src/lib/jwt.ts                     # JWT生成・検証
└── src/routes/users.ts                # 認証付きAPIルート
```

---

## 🚨 トラブルシューティング

### よくある認証エラー

#### 1. "Invalid login credentials"
- **原因**: メールアドレスまたはパスワードが間違っている
- **解決**: 入力内容を確認、パスワードリセット検討

#### 2. "Email not confirmed"
- **原因**: メール認証が完了していない
- **解決**: 確認メールのリンクをクリック

#### 3. "Token expired"
- **原因**: JWTトークンまたはSupabaseセッションが期限切れ
- **解決**: 再ログインまたは自動リフレッシュ

#### 4. "CORS policy error"
- **原因**: ドメイン設定の問題
- **解決**: Supabase設定でドメインを追加

### デバッグ用コマンド
```typescript
// 現在の認証状態確認
const { data: { session } } = await supabase.auth.getSession();
console.log("Session:", session);

// JWT内容確認
const payload = jwt.decode(token);
console.log("JWT Payload:", payload);
```

### 開発環境での注意事項
- **localhost**: HTTPS不要
- **本番環境**: HTTPS必須
- **Cookie設定**: SameSite=Lax（開発時）, SameSite=Strict（本番）

---

## 📊 認証フローの監視

### ログ出力箇所
```typescript
// ログイン成功
console.log("ログイン成功:", { userId: user.id, email: user.email });

// API認証
console.log("JWT検証成功:", { userId: payload.userId });

// 認証エラー
console.error("認証エラー:", error.message);
```

### メトリクス
- **ログイン成功率**: Supabase Dashboard
- **API認証エラー**: Honoサーバーログ
- **セッション継続時間**: Cookie有効期限
