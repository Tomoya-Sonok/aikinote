import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import styles from "./Hero.module.css";

interface HeroProps {
  locale: string;
  signupHref: string;
}

export async function Hero({ locale, signupHref }: HeroProps) {
  const t = await getTranslations({ locale, namespace: "landing.hero" });

  const headingLines = t("heading").split("\n");
  const subtextLines = t("subtext").split("\n");

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID
    <section id="hero" className={styles.hero}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>
          {headingLines.map((line, index) => (
            <Fragment key={line}>
              {line}
              {index < headingLines.length - 1 && <br />}
            </Fragment>
          ))}
        </h1>

        {/* TODO: デザイナーからイラスト+モックの合成画像を受領後に実装
             - hero-illustration.png（ピル型コンテナ、rotate 54.693deg）
             - hero-mock1.png（スマホモック、rotate 13.15deg、ピル上に重ね表示）
             - Figma の正確な配置値は計画ファイルを参照 */}
        <div className={styles.visualArea} />

        <div className={styles.subtextArea}>
          <p className={styles.subtext}>
            {subtextLines.map((line, index) => (
              <Fragment key={line}>
                {line}
                {index < subtextLines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
          <Link href={signupHref} className={styles.cta}>
            <span>{t("ctaLabel")}</span>
            <span className={styles.ctaIcon}>
              <ArrowRightIcon size={14} weight="bold" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
