"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { isNativeApp } from "@/lib/api/native-bridge";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import styles from "./StoreBadges.module.css";

const APP_STORE_URL = "https://apps.apple.com/jp/app/aikinote/id6761960351";
const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.aikinote";

interface StoreBadgesProps {
  trackPrefix: string;
  heading?: ReactNode;
  className?: string;
}

export function StoreBadges({
  trackPrefix,
  heading,
  className,
}: StoreBadgesProps) {
  // ネイティブアプリ (Expo WebView) では非表示。SSR / 初回描画時点でも DOM に
  // 出力しないことで、iOS WebView 上で一瞬「Google Play」が見える App Store
  // Guideline 2.3.10 違反のフラッシュを根絶する。
  const [showBadges, setShowBadges] = useState(false);
  const { track } = useUmamiTrack();

  useEffect(() => {
    if (!isNativeApp()) setShowBadges(true);
  }, []);

  if (!showBadges) return null;

  const wrapperClass = [styles.wrapper, className].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      {heading && <p className={styles.heading}>{heading}</p>}
      <div className={styles.badges}>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className={styles.badgeLink}
          onClick={() => track(`${trackPrefix}_appstore_badge`)}
        >
          <Image
            src="/images/lp/app-store-badge.svg"
            alt="Download on the App Store"
            width={180}
            height={60}
            className={styles.badge}
          />
        </a>
        <a
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noreferrer"
          className={styles.badgeLink}
          onClick={() => track(`${trackPrefix}_googleplay_badge`)}
        >
          <Image
            src="/images/lp/google-play-badge.svg"
            alt="Get it on Google Play"
            width={180}
            height={60}
            className={styles.badge}
          />
        </a>
      </div>
    </div>
  );
}
