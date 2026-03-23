import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { ScrollFadeIn } from "@/components/shared/ScrollFadeIn/ScrollFadeIn";
import styles from "./Faq.module.css";

const FAQ_KEYS = ["security", "easeOfUse", "languages", "mobileApp"] as const;

const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog";

interface FaqProps {
  locale: string;
  signupHref: string;
}

export async function Faq({ locale, signupHref }: FaqProps) {
  const t = await getTranslations({ locale, namespace: "landing" });

  const titleLines = t("faq.title").split("\n");

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID
    <section id="faq" className={styles.section}>
      <div className={styles.decoTopLeft} aria-hidden="true" />
      <div className={styles.decoBottomRight} aria-hidden="true" />
      <span className={styles.bgLabel} aria-hidden="true">
        FAQ
      </span>

      <div className={styles.inner}>
        <div className={styles.header}>
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

        <dl className={styles.faqList}>
          {FAQ_KEYS.map((key, index) => (
            <ScrollFadeIn key={key} delay={index * 100}>
              <div className={styles.faqItem}>
                <dt className={styles.question}>
                  <span className={styles.qBadge} aria-hidden="true">
                    Q
                  </span>
                  <span>{t(`faq.items.${key}.question`)}</span>
                </dt>
                <dd className={styles.answer}>
                  <span className={styles.aBadge} aria-hidden="true">
                    A
                  </span>
                  <span>{t(`faq.items.${key}.answer`)}</span>
                </dd>
                {index < FAQ_KEYS.length - 1 && (
                  <div className={styles.separator} />
                )}
              </div>
            </ScrollFadeIn>
          ))}
        </dl>
      </div>

      <div className={styles.ctaGroup}>
        <a
          href={CONTACT_FORM_URL}
          target="_blank"
          rel="noreferrer"
          className={styles.secondaryCta}
        >
          <span>{t("cta.contact")}</span>
          <span className={styles.secondaryCtaIcon}>
            <ArrowRightIcon size={14} weight="bold" />
          </span>
        </a>
        <Link href={signupHref} className={styles.primaryCta}>
          <span>{t("hero.ctaLabel")}</span>
          <span className={styles.primaryCtaIcon}>
            <ArrowRightIcon size={14} weight="bold" />
          </span>
        </Link>
      </div>
    </section>
  );
}
