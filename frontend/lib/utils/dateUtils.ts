import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * ISO文字列をユーザーのローカル日付（YYYY-MM-DD形式）に変換する
 * @param isoString - ISO 8601形式の日時文字列
 * @returns YYYY-MM-DD形式のローカル日付文字列
 */
export const formatToLocalDateString = (isoString: string): string => {
  return format(parseISO(isoString), "yyyy-MM-dd", { locale: ja });
};

/**
 * ISO文字列をユーザーのローカル日時に変換する
 * @param isoString - ISO 8601形式の日時文字列
 * @returns ローカル日時文字列（yyyy/MM/dd HH:mm形式）
 */
export const formatToLocalDateTime = (isoString: string): string => {
  return format(parseISO(isoString), "yyyy/MM/dd HH:mm", { locale: ja });
};

/**
 * ISO文字列を読みやすい相対時間に変換する（例：2時間前、3日前）
 * @param isoString - ISO 8601形式の日時文字列
 * @returns 相対時間文字列
 */
export const formatToRelativeTime = (isoString: string): string => {
  const date = parseISO(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "たった今";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}時間前`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}日前`;
  } else {
    return format(date, "yyyy/MM/dd", { locale: ja });
  }
};