import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { ScrollFadeIn } from "@/components/shared/ScrollFadeIn/ScrollFadeIn";
import { CtaButton } from "../CtaButton";
import styles from "./Hero.module.css";

interface HeroProps {
  locale: string;
  signupHref: string;
}

export async function Hero({ locale, signupHref }: HeroProps) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const imgPrefix = locale === "en" ? "en-" : "";
  const loginHref = locale === "ja" ? "/login" : `/${locale}/login`;

  const headingLines = t("hero.heading").split("\n");
  const subtextLines = t("hero.subtext").split("\n");

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID
    <section id="hero" className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.textArea}>
          <h1 className={styles.heading}>
            {headingLines.map((line, index) => (
              <Fragment key={line}>
                {line}
                {index < headingLines.length - 1 && <br />}
              </Fragment>
            ))}
          </h1>

          <div className={styles.subtextArea}>
            <p className={styles.subtext}>
              {subtextLines.map((line, index) => (
                <Fragment key={line}>
                  {line}
                  {index < subtextLines.length - 1 && <br />}
                </Fragment>
              ))}
            </p>
            <CtaButton
              variant="primary"
              href={signupHref}
              trackEvent={`landing_page_hero_cta${locale === "en" ? "_en" : ""}`}
            >
              {t("hero.ctaLabel")}
            </CtaButton>
          </div>
          <Link href={loginHref} className={styles.loginLink}>
            {t("cta.loginPrompt")}
          </Link>
        </div>

        <ScrollFadeIn
          direction="right"
          delay={200}
          className={styles.visualWrapper}
        >
          <div className={styles.visualArea}>
            <Image
              src={`/images/lp/${imgPrefix}hero-illustration.png`}
              alt={t("hero.illustrationAlt")}
              width={800}
              height={670}
              sizes="(min-width: 768px) 500px, 340px"
              className={styles.illustration}
              priority
            />
            <Image
              src={`/images/lp/${imgPrefix}hero-mock1.png`}
              alt={t("hero.mockAlt")}
              width={400}
              height={500}
              sizes="(min-width: 768px) 330px, 220px"
              className={styles.mockImage}
              priority
            />
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  );
}
