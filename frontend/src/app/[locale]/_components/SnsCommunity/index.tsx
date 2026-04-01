import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { ScrollFadeIn } from "@/components/shared/ScrollFadeIn/ScrollFadeIn";
import { CtaButton } from "../CtaButton";
import styles from "./SnsCommunity.module.css";

interface SnsCommunityProps {
  locale: string;
  signupHref: string;
}

export async function SnsCommunity({ locale, signupHref }: SnsCommunityProps) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const imgPrefix = locale === "en" ? "en-" : "";

  const titleLines = t("snsCommunity.title").split("\n");

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID
    <section id="sns-community" className={styles.section}>
      <div className={styles.decoBottomLeft} aria-hidden="true" />
      {/* ヒーローエリア（カプセル型背景 + ヘッダー） */}
      <div className={styles.hero}>
        <Image
          src="/images/lp/sp-sns-global-connection.png"
          alt={t("snsCommunity.heroImageAlt")}
          width={402}
          height={486}
          sizes="100vw"
          className={`${styles.heroBgImage} ${styles.heroBgImageSp}`}
          priority
        />
        <Image
          src="/images/lp/sns-global-connection.png"
          alt={t("snsCommunity.heroImageAlt")}
          width={1440}
          height={632}
          sizes="100vw"
          className={`${styles.heroBgImage} ${styles.heroBgImagePc}`}
        />
        <span className={styles.bgLabel} aria-hidden="true">
          WORLD
        </span>
        <div className={styles.headerContent}>
          <span className={styles.badge}>{t("snsCommunity.badge")}</span>
          <h2 className={styles.title}>
            {titleLines.map((line, index) => (
              <Fragment key={line}>
                {line}
                {index < titleLines.length - 1 && <br />}
              </Fragment>
            ))}
          </h2>
          <div className={styles.divider} />
        </div>
      </div>

      {/* 導入テキスト */}
      <p
        className={`${styles.intro}${locale === "en" ? ` ${styles.introEn}` : ""}`}
      >
        {t("snsCommunity.intro")}
      </p>

      {/* フィーチャーカード */}
      <div className={styles.cardsGrid}>
        {/* カード1: 稽古記録をシェア */}
        <ScrollFadeIn delay={0}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              {t("snsCommunity.cards.share.title")}
            </h3>
            <div className={styles.cardDivider} />
            <div className={styles.cardImageWrapper}>
              <Image
                src={`/images/lp/${imgPrefix}sns-searching-man.png`}
                alt={t("snsCommunity.cards.share.imageAlt")}
                width={400}
                height={400}
                sizes="(min-width: 768px) 260px, 280px"
                className={styles.cardImage}
              />
            </div>
            <p
              className={`${styles.cardBody}${locale === "en" ? ` ${styles.cardBodyEn}` : ""}`}
            >
              {t("snsCommunity.cards.share.body")}
            </p>
          </div>
        </ScrollFadeIn>

        {/* カード2: 道場の外に広がる学び */}
        <ScrollFadeIn delay={150}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              {t("snsCommunity.cards.learn.title")}
            </h3>
            <div className={styles.cardDivider} />
            <div
              className={`${styles.cardImageWrapper} ${styles.cardImageCircle}`}
            >
              <Image
                src={`/images/lp/${imgPrefix}sns-doing-aikido-man.png`}
                alt={t("snsCommunity.cards.learn.imageAlt")}
                width={400}
                height={400}
                sizes="(min-width: 768px) 260px, 280px"
                className={styles.cardImage}
              />
            </div>
            <p
              className={`${styles.cardBody}${locale === "en" ? ` ${styles.cardBodyEn}` : ""}`}
            >
              {t("snsCommunity.cards.learn.body")}
            </p>
          </div>
        </ScrollFadeIn>

        {/* カード3: 国境を超えたコミュニティ */}
        <ScrollFadeIn delay={300}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              {t("snsCommunity.cards.community.title")}
            </h3>
            <div className={styles.cardDivider} />
            <div className={styles.cardImageWrapper}>
              <Image
                src={`/images/lp/${imgPrefix}sns-chat-online.png`}
                alt={t("snsCommunity.cards.community.imageAlt")}
                width={400}
                height={400}
                sizes="(min-width: 768px) 260px, 280px"
                className={styles.cardImage}
              />
            </div>
            <p
              className={`${styles.cardBody}${locale === "en" ? ` ${styles.cardBodyEn}` : ""}`}
            >
              {t("snsCommunity.cards.community.body")}
            </p>
            <p
              className={`${styles.cardNote}${locale === "en" ? ` ${styles.cardNoteEn}` : ""}`}
            >
              {t("snsCommunity.cards.community.note")}
            </p>
          </div>
        </ScrollFadeIn>
      </div>

      {/* CTA */}
      <div className={styles.ctaWrapper}>
        <CtaButton
          variant="primary"
          href={signupHref}
          trackEvent={`landing_page_sns_community_cta${locale === "en" ? "_en" : ""}`}
        >
          {t("snsCommunity.ctaLabel")}
        </CtaButton>
      </div>
    </section>
  );
}
