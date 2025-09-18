import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendVerificationEmailParams {
  email: string;
  username: string;
  verificationToken: string;
}

interface SendPasswordResetEmailParams {
  email: string;
  resetToken: string;
}

export async function sendVerificationEmail({
  email,
  username,
  verificationToken,
}: SendVerificationEmailParams) {
  console.log("=== Email Environment Variables Check ===");
  console.log(
    "RESEND_API_KEY:",
    process.env.RESEND_API_KEY
      ? `${process.env.RESEND_API_KEY.slice(0, 10)}...`
      : "UNDEFINED",
  );
  console.log(
    "RESEND_FROM_EMAIL:",
    process.env.RESEND_FROM_EMAIL || "UNDEFINED",
  );
  console.log(
    "APP_URL:",
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "UNDEFINED",
  );
  console.log("==========================================");

  const appUrl = getAppUrl();
  const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

  // TODO: HTMLメールではなくReactコンポーネントでメール文面を整える
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
      to: [email],
      subject: "メールアドレスの認証",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>メールアドレスの認証</h2>
          <p>こんにちは、${username}さん！</p>
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
    });

    if (error) {
      console.error("認証メール送信エラー:", error);
      throw new Error("認証メールの送信に失敗しました");
    }

    return data;
  } catch (error) {
    console.error("認証メール送信エラー:", error);
    throw new Error("認証メールの送信に失敗しました");
  }
}

export async function sendPasswordResetEmail({
  email,
  resetToken,
}: SendPasswordResetEmailParams) {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  // TODO: HTMLメールではなくReactコンポーネントでメール文面を整える
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
      to: [email],
      subject: "パスワードリセット",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>パスワードリセット</h2>
          <p>パスワードリセットのリクエストを受け付けました。</p>
          <p>以下のリンクをクリックして、新しいパスワードを設定してください。</p>
          <a
            href="${resetUrl}"
            style="display: inline-block; padding: 12px 24px; background-color: #007cba; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;"
          >
            パスワードをリセットする
          </a>
          <p>このリンクは1時間後に期限切れになります。</p>
          <p>もしこのリクエストに心当たりがない場合は、このメールを無視してください。</p>
        </div>
      `,
    });

    if (error) {
      console.error("パスワードリセットメール送信エラー:", error);
      throw new Error("パスワードリセットメールの送信に失敗しました");
    }

    return data;
  } catch (error) {
    console.error("パスワードリセットメール送信エラー:", error);
    throw new Error("パスワードリセットメールの送信に失敗しました");
  }
}

function getAppUrl() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.NODE_ENV === "test" ? "http://localhost:3000" : undefined);

  if (!appUrl) {
    throw new Error(
      "アプリケーションのURLが設定されていません。NEXT_PUBLIC_APP_URL もしくは APP_URL を設定してください。",
    );
  }

  return appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
}
