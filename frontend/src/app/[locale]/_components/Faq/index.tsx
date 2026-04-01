import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { ScrollFadeIn } from "@/components/shared/ScrollFadeIn/ScrollFadeIn";
import { CtaButton } from "../CtaButton";
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
                <dd
                  className={`${styles.answer}${locale === "en" ? ` ${styles.answerEn}` : ""}`}
                >
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
        <CtaButton variant="secondary" external href={CONTACT_FORM_URL}>
          {t("cta.contact")}
        </CtaButton>
        <CtaButton
          variant="primary"
          href={signupHref}
          trackEvent={`landing_page_faq_cta${locale === "en" ? "_en" : ""}`}
        >
          {t("faq.ctaLabel")}
        </CtaButton>
      </div>
    </section>
  );
}
