import { zValidator } from "@hono/zod-validator";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Hono, type Context } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";

type UserBindings = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JWT_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXTAUTH_URL?: string;
  APP_URL?: string;
  VERCEL_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
};

type UserVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{ Bindings: UserBindings; Variables: UserVariables }>();

let supabaseForUsers: SupabaseClient | null = null;

const resolveSupabaseClient = (
  c: Context<{ Bindings: UserBindings; Variables: UserVariables }>,
  options: { useContext?: boolean } = {},
): SupabaseClient | null => {
  const { useContext = true } = options;
  const supabaseFromContext = useContext ? c.get("supabase") : null;

  if (supabaseFromContext) {
    return supabaseFromContext;
  }

  if (supabaseForUsers) {
    return supabaseForUsers;
  }

  const supabaseUrl =
    c.env?.SUPABASE_URL ??
    (typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined) ??
    "";
  const supabaseServiceKey =
    c.env?.SUPABASE_SERVICE_ROLE_KEY ??
    (typeof process !== "undefined"
      ? process.env?.SUPABASE_SERVICE_ROLE_KEY
      : undefined) ??
    "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  supabaseForUsers = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseForUsers;
};

// プロフィール更新のスキーマ
const updateProfileSchema = z.object({
  username: z.string().min(1, "ユーザー名は必須です").optional(),
  dojo_style_name: z.string().nullable().optional(),
  training_start_date: z.string().nullable().optional(),
  profile_image_url: z.string().nullable().optional(),
});

const signUpSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  username: z.string().min(1, "ユーザー名は必須です"),
});

function formatZodErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  const filteredEntries = Object.entries(fieldErrors)
    .filter(([, messages]) => messages && messages.length > 0)
    .map(([field, messages]) => [field, messages ?? []]);

  return Object.fromEntries(filteredEntries) as Record<string, string[]>;
}

const getEnvValue = (
  c: Context<{ Bindings: UserBindings; Variables: UserVariables }>,
  key: keyof UserBindings | "NEXTAUTH_URL" | "APP_URL" | "VERCEL_URL",
): string | undefined => {
  return (
    c.env?.[key] ??
    (typeof process !== "undefined" ? process.env?.[key] : undefined)
  );
};

const getBaseUrl = (
  c: Context<{ Bindings: UserBindings; Variables: UserVariables }>,
): string => {
  // 1. フロントエンドから渡された X-App-Url ヘッダーを最優先
  const xAppUrl = c.req.header("X-App-Url");
  if (xAppUrl) {
    return xAppUrl.replace(/\/+$/, "");
  }

  // 2. 環境変数
  const appUrl =
    getEnvValue(c, "NEXT_PUBLIC_APP_URL") ??
    getEnvValue(c, "NEXTAUTH_URL") ??
    getEnvValue(c, "APP_URL");

  if (appUrl) {
    return appUrl.replace(/\/+$/, "");
  }

  const vercelUrl = getEnvValue(c, "VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
};

const buildRedirectUrl = (
  c: Context<{ Bindings: UserBindings; Variables: UserVariables }>,
  path: string = "",
): string => {
  const baseUrl = getBaseUrl(c);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

const generateVerificationToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const sendVerificationEmail = async (
  c: Context<{ Bindings: UserBindings; Variables: UserVariables }>,
  params: { email: string; username: string; verificationToken: string },
) => {
  const resendApiKey = getEnvValue(c, "RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY が設定されていません");
  }

  const fromEmail = getEnvValue(c, "RESEND_FROM_EMAIL") || "noreply@example.com";
  const verificationUrl = buildRedirectUrl(
    c,
    `/verify-email?token=${params.verificationToken}`,
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.email],
      subject: "メールアドレスの認証",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>メールアドレスの認証</h2>
          <p>こんにちは、${params.username}さん！</p>
          <p>アカウントの作成ありがとうございます。以下のリンクをクリックして、メールアドレスの認証を完了してください。</p>
          <a
            href="${verificationUrl}"
            style="display: inline-block; padding: 12px 24px; background-color: #007cba; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;"
          >
            メールアドレスを認証する
          </a>
          <p>このリンクは1時間後に期限切れになります。</p>
          <p>もしこのメールに心当たりがない場合は、このメールを無視してください。</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    const detail = responseText ? `: ${responseText}` : "";
    throw new Error(`認証メールの送信に失敗しました${detail}`);
  }
};

const initializeUserTagsIfNeeded = async (
  supabase: SupabaseClient,
  userId: string,
) => {
  const { count, error: countError } = await supabase
    .from("UserTag")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    console.error("初期タグ確認エラー:", countError);
    return;
  }

  if (count && count > 0) {
    return;
  }

  const { data: templates, error: templatesError } = await supabase
    .from("DefaultTagTemplate")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (templatesError || !templates) {
    console.error("初期タグ取得エラー:", templatesError);
    return;
  }

  const userTags = templates.map((template) => ({
    user_id: userId,
    category: template.category,
    name: template.name,
  }));

  const { error: insertError } = await supabase
    .from("UserTag")
    .insert(userTags);

  if (insertError) {
    console.error("初期タグ作成エラー:", insertError);
  }
};

// ユーザー作成API
app.post("/", async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "リクエストの形式が正しくありません",
      },
      400,
    );
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "入力内容に誤りがあります",
        details: formatZodErrors(parsed.error),
      },
      400,
    );
  }

  const supabase = resolveSupabaseClient(c, { useContext: false });

  if (!supabase) {
    return c.json(
      {
        success: false,
        error: "サーバー設定が不正です",
      },
      500,
    );
  }

  const { email, password, username } = parsed.data;

  const { data: existingEmail, error: emailError } = await supabase
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (emailError) {
    return c.json(
      {
        success: false,
        error: "ユーザー作成に失敗しました",
      },
      500,
    );
  }

  if (existingEmail) {
    return c.json(
      {
        success: false,
        error: "既に登録済みのメールアドレスです",
      },
      400,
    );
  }

  const { data: existingUsername, error: usernameError } = await supabase
    .from("User")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (usernameError) {
    return c.json(
      {
        success: false,
        error: "ユーザー作成に失敗しました",
      },
      500,
    );
  }

  if (existingUsername) {
    return c.json(
      {
        success: false,
        error: "このユーザー名は既に使用されています",
      },
      400,
    );
  }

  const verificationToken = generateVerificationToken();
  const passwordHash = await hashPassword(password);

  let createdUserId: string | null = null;
  let userInserted = false;

  try {
    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          username,
        },
      });

    if (createUserError || !createdUser?.user) {
      const errorMessage =
        createUserError?.message ?? "ユーザー作成に失敗しました";

      if (errorMessage.includes("email")) {
        return c.json(
          {
            success: false,
            error: "既に登録済みのメールアドレスです",
          },
          400,
        );
      }

      return c.json(
        {
          success: false,
          error: errorMessage,
        },
        500,
      );
    }

    createdUserId = createdUser.user.id;

    const { data: insertedUser, error: insertError } = await supabase
      .from("User")
      .insert({
        id: createdUserId,
        email,
        username,
        profile_image_url: null,
        training_start_date: null,
        publicity_setting: "private",
        language: "ja",
        is_email_verified: false,
        verification_token: verificationToken,
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, email, username")
      .single();

    if (insertError) {
      await supabase.auth.admin.deleteUser(createdUserId);

      if (
        insertError.message.includes("duplicate") ||
        insertError.message.includes("unique")
      ) {
        return c.json(
          {
            success: false,
            error: "既に登録済みのメールアドレスまたはユーザー名です",
          },
          400,
        );
      }

      return c.json(
        {
          success: false,
          error: "ユーザー作成に失敗しました",
        },
        500,
      );
    }

    userInserted = true;

    try {
      await sendVerificationEmail(c, {
        email,
        username,
        verificationToken,
      });
    } catch (emailError) {
      await supabase.from("User").delete().eq("id", createdUserId);
      await supabase.auth.admin.deleteUser(createdUserId);

      return c.json(
        {
          success: false,
          error:
            emailError instanceof Error
              ? emailError.message
              : "認証メールの送信に失敗しました。しばらくしてからもう一度お試しください。",
        },
        500,
      );
    }

    await initializeUserTagsIfNeeded(supabase, createdUserId);

    return c.json({
      success: true,
      data: insertedUser,
      message: "ユーザー登録が完了しました。認証メールを確認してください。",
    });
  } catch (error) {
    if (createdUserId) {
      if (userInserted) {
        await supabase.from("User").delete().eq("id", createdUserId);
      }
      await supabase.auth.admin.deleteUser(createdUserId);
    }

    return c.json(
      {
        success: false,
        error: "ユーザー作成に失敗しました",
      },
      500,
    );
  }
});

// ユーザープロフィール取得API
app.get("/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const authHeader = c.req.header("Authorization");

    // JWT認証
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    // 本人のプロフィールのみ取得可能
    if (payload.userId !== userId) {
      return c.json(
        {
          success: false,
          error: "他のユーザーのプロフィールは取得できません",
        },
        403,
      );
    }

    const supabase = resolveSupabaseClient(c);

    if (!supabase) {
      return c.json(
        {
          success: false,
          error: "サーバー設定が不正です",
        },
        500,
      );
    }

    // Supabaseからユーザー情報を取得
    const { data: userData, error } = await supabase
      .from("User")
      .select(
        "id, email, username, profile_image_url, dojo_style_name, training_start_date",
      )
      .eq("id", userId)
      .single();

    if (error) {
      return c.json(
        {
          success: false,
          error: "ユーザー情報の取得に失敗しました",
        },
        500,
      );
    }

    if (!userData) {
      return c.json(
        {
          success: false,
          error: "ユーザーが見つかりません",
        },
        404,
      );
    }

    return c.json({
      success: true,
      data: userData,
      message: "ユーザー情報を取得しました",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization header") ||
        error.message.includes("Invalid authorization"))
    ) {
      return c.json(
        {
          success: false,
          error: "認証に失敗しました",
        },
        401,
      );
    }

    return c.json(
      {
        success: false,
        error: "サーバーエラーが発生しました",
      },
      500,
    );
  }
});

// ユーザープロフィール更新API
app.put("/:userId", zValidator("json", updateProfileSchema), async (c) => {
  try {
    const userId = c.req.param("userId");
    const authHeader = c.req.header("Authorization");
    const updateData = c.req.valid("json");

    // JWT認証
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    // 本人のプロフィールのみ更新可能
    if (payload.userId !== userId) {
      return c.json(
        {
          success: false,
          error: "他のユーザーのプロフィールは更新できません",
        },
        403,
      );
    }

    // ユーザー名のバリデーション（簡易版）
    if (updateData.username && updateData.username.length > 20) {
      return c.json(
        {
          success: false,
          error: "ユーザー名は20文字以内で入力してください",
        },
        400,
      );
    }

    const supabase = resolveSupabaseClient(c);

    if (!supabase) {
      return c.json(
        {
          success: false,
          error: "サーバー設定が不正です",
        },
        500,
      );
    }

    // 更新データが空の場合はupdateをスキップして現在のデータを返す
    if (Object.keys(updateData).length === 0) {
      const { data: currentUser, error: fetchError } = await supabase
        .from("User")
        .select(
          "id, email, username, profile_image_url, dojo_style_name, training_start_date",
        )
        .eq("id", userId)
        .single();

      if (fetchError || !currentUser) {
        return c.json(
          {
            success: false,
            error: "ユーザー情報の取得に失敗しました",
          },
          500,
        );
      }

      return c.json({
        success: true,
        data: currentUser,
        message: "変更はありません",
      });
    }

    // Supabaseでユーザー情報を更新
    const { data: updatedUser, error: updateError } = await supabase
      .from("User")
      .update(updateData)
      .eq("id", userId)
      .select(
        "id, email, username, profile_image_url, dojo_style_name, training_start_date",
      )
      .single();

    if (updateError) {
      return c.json(
        {
          success: false,
          error: "プロフィールの更新に失敗しました",
        },
        500,
      );
    }

    return c.json({
      success: true,
      data: updatedUser,
      message: "プロフィールを更新しました",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization header") ||
        error.message.includes("Invalid authorization"))
    ) {
      return c.json(
        {
          success: false,
          error: "認証に失敗しました",
        },
        401,
      );
    }

    return c.json(
      {
        success: false,
        error: "サーバーエラーが発生しました",
      },
      500,
    );
  }
});

export default app;
