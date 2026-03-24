import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { ScrollFadeIn } from "@/components/shared/ScrollFadeIn/ScrollFadeIn";
import { CtaButton } from "../CtaButton";
import styles from "./Steps.module.css";

interface StepsProps {
  locale: string;
  signupHref: string;
}

export async function Steps({ locale, signupHref }: StepsProps) {
  const t = await getTranslations({
    locale,
    namespace: "landing",
  });
  const imgPrefix = locale === "en" ? "en-" : "";
  const stepImages = [
    `/images/lp/${imgPrefix}step-1-create-button.png`,
    `/images/lp/${imgPrefix}step-2-select-tags.png`,
    `/images/lp/${imgPrefix}step-3-save.png`,
  ];

  const subtitleLines = t("solutionRecording.subtitle").split("\n");
  const steps = t.raw("solutionRecording.steps") as Array<{
    title: string;
    body: string;
    imageAlt: string;
  }>;

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID
    <section id="solution-recording" className={styles.section}>
      <div className={styles.decoTopLeft} aria-hidden="true" />
      <div className={styles.decoBottomRight} aria-hidden="true" />
      <span className={styles.bgLabel} aria-hidden="true">
        3 STEPS
      </span>

      <div className={styles.header}>
        <span className={styles.badge}>{t("solutionRecording.badge")}</span>
        <h2 className={styles.title}>
          <span className={styles.titlePrefix}>
            {t("solutionRecording.titlePrefix")}
          </span>
          <br />
          <span className={styles.titleNumber}>
            {t("solutionRecording.titleNumber")}
          </span>
          <span className={styles.titleSuffix}>
            {t("solutionRecording.titleSuffix")}
          </span>
        </h2>
        <div className={styles.divider} />
        <p className={styles.subtitle}>
          {subtitleLines.map((line, index) => (
            <Fragment key={line}>
              {line}
              {index < subtitleLines.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      </div>

      <ol className={styles.stepList}>
        {steps.map((step, index) => (
          <ScrollFadeIn key={step.title}>
            <li className={styles.stepItem}>
              <div
                className={`${styles.stepImageWrapper}${index === 1 ? ` ${styles.stepImageWrapperWide}` : ""}`}
              >
                <Image
                  src={stepImages[index]}
                  alt={step.imageAlt}
                  width={650}
                  height={640}
                  sizes="301px"
                  className={styles.stepImage}
                />
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p
                className={`${styles.stepBody}${locale === "en" ? ` ${styles.stepBodyEn}` : ""}`}
              >
                {step.body}
              </p>

              {index < steps.length - 1 && (
                <div className={styles.stepSeparator} aria-hidden="true">
                  <div className={styles.separatorLine} />
                  <div className={styles.separatorDot} />
                </div>
              )}
            </li>
          </ScrollFadeIn>
        ))}
      </ol>

      <div className={styles.ctaWrapper}>
        <CtaButton variant="primary" href={signupHref}>
          {t("solutionRecording.ctaLabel")}
        </CtaButton>
      </div>
    </section>
  );
}
