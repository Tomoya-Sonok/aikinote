// 通報受領時に運営アドレスへ Email を送る fire-and-forget 通知。
// Apple App Review Guideline 1.2 (UGC) の「24h 以内に対応」要件を実効性のある運用で満たすため。
// 既存メールアドレス認証 (backend/src/routes/users/index.ts:178-248) と完全同形式の Resend POST を使用。

const OPS_REPORT_EMAIL = "support@aikinote.com";

const REASON_LABELS: Record<string, string> = {
  spam: "スパム",
  harassment: "嫌がらせ",
  inappropriate: "不適切な内容",
  impersonation: "なりすまし",
  other: "その他",
};

export interface ReportEmailParams {
  type: "post" | "reply";
  reportId: string;
  reason: string;
  detail: string | null;
  reporterUsername: string;
  targetUsername: string;
  contentSnippet: string;
  /** 対象投稿/返信を含む詳細ページの URL */
  targetUrl: string;
}

export interface ReportEmailEnv {
  resendApiKey: string | undefined;
  resendFromEmail: string | undefined;
}

/**
 * 運営アドレス (support@aikinote.com) に通報メールを送信する。
 * - RESEND_API_KEY 未設定時は警告のみで黙ってスキップ（通報自体を失敗させない）
 * - HTTP 失敗時も例外は投げず console.error のみ
 */
export async function notifyReportEmail(
  params: ReportEmailParams,
  env: ReportEmailEnv,
): Promise<void> {
  if (!env.resendApiKey) {
    console.warn(
      "[Report] RESEND_API_KEY 未設定のため通報メールをスキップしました",
    );
    return;
  }

  const fromEmail = env.resendFromEmail || "noreply@example.com";
  const typeLabel = params.type === "post" ? "投稿" : "返信";
  const reasonLabel = REASON_LABELS[params.reason] ?? params.reason;
  const subject = `[AikiNote 通報] ${typeLabel}通報 - ${reasonLabel}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>新しい${escapeHtml(typeLabel)}通報が届きました</h2>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <th style="text-align: left; padding: 8px; background: #f5f5f5; width: 140px;">通報 ID</th>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(params.reportId)}</td>
        </tr>
        <tr>
          <th style="text-align: left; padding: 8px; background: #f5f5f5;">通報理由</th>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(reasonLabel)}</td>
        </tr>
        <tr>
          <th style="text-align: left; padding: 8px; background: #f5f5f5;">詳細</th>
          <td style="padding: 8px; border-bottom: 1px solid #eee; white-space: pre-wrap;">${escapeHtml(
            params.detail ?? "(未入力)",
          )}</td>
        </tr>
        <tr>
          <th style="text-align: left; padding: 8px; background: #f5f5f5;">通報者</th>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(params.reporterUsername)}</td>
        </tr>
        <tr>
          <th style="text-align: left; padding: 8px; background: #f5f5f5;">対象ユーザー</th>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(params.targetUsername)}</td>
        </tr>
        <tr>
          <th style="text-align: left; padding: 8px; background: #f5f5f5;">対象 URL</th>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <a href="${escapeHtml(params.targetUrl)}">${escapeHtml(params.targetUrl)}</a>
          </td>
        </tr>
      </table>

      <h3>本文抜粋</h3>
      <blockquote style="border-left: 4px solid #ccc; padding: 8px 12px; color: #333; white-space: pre-wrap;">${escapeHtml(
        params.contentSnippet,
      )}</blockquote>

      <p style="color: #555; font-size: 13px; margin-top: 24px;">
        Apple App Review Guideline 1.2 の運用要件として、本通報は受領から
        <strong>24 時間以内</strong> に確認・対応することを目標としています。
        Supabase Studio で対象を確認のうえ、不適切と判断したら
        <code>SocialPost.is_deleted</code>（または <code>SocialReply.is_deleted</code>）を
        <code>true</code> に、 <code>PostReport.status</code> を
        <code>resolved</code> に更新してください。
      </p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [OPS_REPORT_EMAIL],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      console.error(
        "[Report] Resend エラー:",
        response.status,
        responseText.slice(0, 500),
      );
    }
  } catch (error) {
    console.error("[Report] Email 通知失敗:", error);
  }
}

/** ユーザー入力を HTML テンプレートに埋め込む際の最小エスケープ。 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
