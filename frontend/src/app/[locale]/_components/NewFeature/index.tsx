import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import styles from "./NewFeature.module.css";

interface NewFeatureProps {
  locale: string;
  signupHref: string;
}

export async function NewFeature({ locale, signupHref }: NewFeatureProps) {
  const t = await getTranslations({ locale, namespace: "landing" });

  const titleLines = t("newFeature.title").split("\n");

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID
    <section id="new-feature" className={styles.section}>
      <div className={styles.decoTopLeft} aria-hidden="true" />
      <div className={styles.decoBottomRight} aria-hidden="true" />
      <span className={styles.bgLabel} aria-hidden="true">
        TRACKABLE
      </span>

      <div className={styles.header}>
        <span className={styles.badge}>{t("newFeature.badge")}</span>
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

      <div className={styles.cardPanel}>
        {/* 統計データ */}
        <div className={styles.featureBlock}>
          <div className={styles.featureVisual}>
            <div className={styles.pillBg}>
              <Image
                src="/images/lp/stats-data-bg.png"
                alt=""
                width={586}
                height={234}
                sizes="350px"
                className={styles.pillBgImage}
              />
            </div>
            <div className={styles.mockImageWrapper}>
              <Image
                src="/images/lp/new-feature-mock1.png"
                alt={t("newFeature.stats.imageAlt")}
                width={300}
                height={500}
                sizes="(min-width: 768px) 250px, 200px"
                className={styles.mockImage}
              />
            </div>
          </div>
          <div className={styles.featureText}>
            <h3 className={styles.featureTitle}>
              {t("newFeature.stats.title")}
            </h3>
            <p className={styles.featureBody}>{t("newFeature.stats.body")}</p>
          </div>
        </div>

        {/* カレンダー */}
        <div className={`${styles.featureBlock} ${styles.featureBlockReverse}`}>
          <div className={styles.featureVisual}>
            <div className={`${styles.pillBg} ${styles.pillBgRight}`}>
              <Image
                src="/images/lp/calendar-grid-bg.png"
                alt=""
                width={586}
                height={234}
                sizes="350px"
                className={styles.pillBgImage}
              />
            </div>
            <div className={styles.mockImageWrapper}>
              <Image
                src="/images/lp/new-feature-mock2.png"
                alt={t("newFeature.calendar.imageAlt")}
                width={300}
                height={500}
                sizes="(min-width: 768px) 250px, 200px"
                className={styles.mockImage}
              />
            </div>
          </div>
          <div className={styles.featureText}>
            <h3 className={styles.featureTitle}>
              {t("newFeature.calendar.title")}
            </h3>
            <p className={styles.featureBody}>
              {t("newFeature.calendar.body")}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.ctaWrapper}>
        <Link href={signupHref} className={styles.cta}>
          <span>{t("hero.ctaLabel")}</span>
          <span className={styles.ctaIcon}>
            <ArrowRightIcon size={14} weight="bold" />
          </span>
        </Link>
      </div>
    </section>
  );
}
