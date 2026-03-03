import { Resend } from "resend";
import { getRedirectUrl } from "./env";

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

interface SendEmailChangeEmailParams {
  email: string;
  username: string;
  emailChangeToken: string;
}

export async function sendVerificationEmail({
  email,
  username,
  verificationToken,
}: SendVerificationEmailParams) {
  const verificationUrl = getRedirectUrl(
    `/verify-email?token=${verificationToken}`,
  );

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

export async function sendEmailChangeEmail({
  email,
  username,
  emailChangeToken,
}: SendEmailChangeEmailParams) {
  const changeUrl = getRedirectUrl(
    `/confirm-email-change?token=${emailChangeToken}`,
  );

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
      to: [email],
      subject: "メールアドレス変更の確認",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>メールアドレス変更の確認</h2>
          <p>こんにちは、${username}さん！</p>
          <p>メールアドレスの変更を受け付けました。以下のリンクをクリックして変更を完了してください。</p>
          <a
            href="${changeUrl}"
            style="display: inline-block; padding: 12px 24px; background-color: #007cba; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;"
          >
            メールアドレスを変更する
          </a>
          <p>このリンクは1時間後に期限切れになります。</p>
          <p>もしこのリクエストに心当たりがない場合は、このメールを無視してください。</p>
        </div>
      `,
    });

    if (error) {
      console.error("メール変更確認メール送信エラー:", error);
      throw new Error("メール変更確認メールの送信に失敗しました");
    }

    return data;
  } catch (error) {
    console.error("メール変更確認メール送信エラー:", error);
    throw new Error("メール変更確認メールの送信に失敗しました");
  }
}

export async function sendPasswordResetEmail({
  email,
  resetToken,
}: SendPasswordResetEmailParams) {
  const resetUrl = getRedirectUrl(`/reset-password?token=${resetToken}`);

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
