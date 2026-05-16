"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

/**
 * 「ネット接続必須」操作の入口で 1 行ガードするためのヘルパフック。
 *
 * 使い方:
 *   const requireOnline = useRequireOnline();
 *   const handleCreate = async () => {
 *     if (!requireOnline()) return; // オフライン時は Toast 表示 + false 返却
 *     ...
 *   };
 *
 * Toast variant は既存実装 ("success" | "error" | "info") のうち、
 * 「エラーではなく注意喚起」レベルとして "info" を使う。
 */
export function useRequireOnline(): () => boolean {
  const isOnline = useOnlineStatus();
  const { showToast } = useToast();
  const t = useTranslations("offlineGuard");

  return useCallback(() => {
    if (isOnline) return true;
    showToast(t("actionRequiresNetwork"), "info");
    return false;
  }, [isOnline, showToast, t]);
}
