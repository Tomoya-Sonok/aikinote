import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import styles from "./Steps.module.css";

interface StepsProps {
  locale: string;
  signupHref: string;
}

const STEP_IMAGES = [
  "/images/lp/step-1-create-button.png",
  "/images/lp/step-2-select-tags.png",
  "/images/lp/step-3-save.png",
];

export async function Steps({ locale, signupHref }: StepsProps) {
  const t = await getTranslations({
    locale,
    namespace: "landing",
  });

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
          <li key={step.title} className={styles.stepItem}>
            <div className={styles.stepNumber}>
              <span className={styles.stepLabel}>STEP</span>
              <span className={styles.stepNum}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className={styles.stepLine} />
            </div>
            <div className={styles.stepImageWrapper}>
              <div className={styles.stepCircle}>
                <Image
                  src={STEP_IMAGES[index]}
                  alt={step.imageAlt}
                  width={280}
                  height={280}
                  sizes="(min-width: 768px) 280px, 240px"
                  className={styles.stepImage}
                />
              </div>
            </div>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepBody}>{step.body}</p>

            {index < steps.length - 1 && (
              <div className={styles.stepSeparator} aria-hidden="true">
                <div className={styles.separatorLine} />
                <div className={styles.separatorDot} />
              </div>
            )}
          </li>
        ))}
      </ol>

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
