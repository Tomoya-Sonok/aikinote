import type { UserSession } from "@/lib/auth";

/**
 * 表示用プロフィールのスナップショット（localStorage）。
 * 起動直後に getSession / getUserInfo の往復を待たずに、前回のユーザー ID・アバター・名前で
 * 画面を描画するために使う。認証の根拠にはしない（最終的には getSession の結果で上書き・破棄する）。
 */
const STORAGE_KEY = "aikinote:profile-snapshot";

export type ProfileSnapshot = Pick<
  UserSession,
  | "id"
  | "username"
  | "profile_image_url"
  | "dojo_style_name"
  | "aikido_rank"
  | "full_name"
>;

const isProfileSnapshot = (value: unknown): value is ProfileSnapshot => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.username === "string";
};

export function readProfileSnapshot(): ProfileSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isProfileSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeProfileSnapshot(user: UserSession): void {
  const snapshot: ProfileSnapshot = {
    id: user.id,
    username: user.username,
    profile_image_url: user.profile_image_url,
    dojo_style_name: user.dojo_style_name,
    aikido_rank: user.aikido_rank,
    full_name: user.full_name,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ストレージが使えない環境（プライベートモード等）では保存しない
  }
}

export function clearProfileSnapshot(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

/** スナップショットから、フルプロフィール到着前に使う暫定ユーザーを組み立てる */
export function userFromSnapshot(
  snapshot: ProfileSnapshot,
  email = "",
): UserSession {
  return {
    ...snapshot,
    email,
  };
}
