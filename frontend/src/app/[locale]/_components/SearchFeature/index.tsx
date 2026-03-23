import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { AikinoteRightArrow } from "@/components/shared/Icons/AikinoteRightArrow";
import { ScrollFadeIn } from "@/components/shared/ScrollFadeIn/ScrollFadeIn";
import styles from "./SearchFeature.module.css";

interface SearchFeatureProps {
  locale: string;
  signupHref: string;
}

export async function SearchFeature({
  locale,
  signupHref,
}: SearchFeatureProps) {
  const t = await getTranslations({ locale, namespace: "landing" });

  const titleLines = t("solutionSearch.title").split("\n");

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID
    <section id="solution-search" className={styles.section}>
      <div className={styles.decoTopRight} aria-hidden="true" />
      <div className={styles.decoBottomLeft} aria-hidden="true" />
      <span className={styles.bgLabel} aria-hidden="true">
        SEARCHABLE
      </span>

      <ScrollFadeIn>
        <div className={styles.inner}>
          <div className={styles.textArea}>
            <span className={styles.badge}>{t("solutionSearch.badge")}</span>
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

          <div className={styles.visualArea}>
            <div className={styles.mockCircle}>
              <div className={styles.mockImageWrapper}>
                <Image
                  src="/images/lp/search-feature-mock1.png"
                  alt={t("solutionSearch.imageAlt")}
                  width={300}
                  height={500}
                  sizes="(min-width: 768px) 300px, 260px"
                  className={styles.mockImage}
                />
              </div>
            </div>
          </div>

          <p className={styles.body}>{t("solutionSearch.body")}</p>
        </div>
      </ScrollFadeIn>

      <div className={styles.ctaWrapper}>
        <Link href={signupHref} className={styles.cta}>
          <span>{t("hero.ctaLabel")}</span>
          <span className={styles.ctaIcon}>
            <AikinoteRightArrow size={14} />
          </span>
        </Link>
      </div>
    </section>
  );
}
