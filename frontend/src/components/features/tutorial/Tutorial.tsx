"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AikinoteRightArrow } from "@/components/shared/Icons/AikinoteRightArrow";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useTutorialStore } from "@/stores/tutorialStore";
import { useTutorialState } from "./hooks/useTutorialState";
import { StepCTA } from "./steps/StepCTA";
import { StepFontSize } from "./steps/StepFontSize";
import { StepHitoride } from "./steps/StepHitoride";
import { StepMinnaDe } from "./steps/StepMinnaDe";
import { StepMyPage } from "./steps/StepMyPage";
import { StepWelcome } from "./steps/StepWelcome";
import styles from "./Tutorial.module.css";

export function Tutorial() {
  const t = useTranslations("tutorial");
  const setHasSeenTutorial = useTutorialStore((s) => s.setHasSeenTutorial);
  const { track } = useUmamiTrack();

  const [mounted, setMounted] = useState(false);

  const {
    step,
    totalSteps,
    transitioning,
    direction,
    isLastStep,
    fontSize,
    next,
    prev,
    skipToEnd,
    handleFontSizeChange,
  } = useTutorialState();

  useEffect(() => {
    setMounted(true);
  }, []);

  const SKIP_EVENT_NAMES = [
    "tutorial_step1_skip",
    "tutorial_step2_skip",
    "tutorial_step3_skip",
    "tutorial_step4_skip",
    "tutorial_step5_skip",
  ];

  const handleSkip = () => {
    if (step < SKIP_EVENT_NAMES.length) {
      track(SKIP_EVENT_NAMES[step]);
    }
    skipToEnd();
  };

  const handleComplete = () => {
    setHasSeenTutorial(true);
  };

  const contentClassName = [
    styles.content,
    transitioning
      ? `${styles.contentTransitioning} ${direction > 0 ? styles.contentTransitionForward : styles.contentTransitionBackward}`
      : styles.contentVisible,
  ].join(" ");

  const steps = [
    <StepWelcome key="welcome" />,
    <StepFontSize
      key="fontSize"
      fontSize={fontSize}
      onFontSizeChange={handleFontSizeChange}
    />,
    <StepHitoride key="hitoride" />,
    <StepMinnaDe key="minnaDe" />,
    <StepMyPage key="myPage" />,
    <StepCTA key="cta" onComplete={handleComplete} fontSize={fontSize} />,
  ];

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button
            type="button"
            className={`${styles.backButton} ${step > 0 ? styles.backButtonVisible : styles.backButtonHidden}`}
            onClick={prev}
            aria-label={t("backAriaLabel")}
          >
            <ArrowLeft size={20} weight="light" />
          </button>

          <nav
            className={styles.dots}
            aria-label={t("stepIndicatorAriaLabel", {
              current: step + 1,
              total: totalSteps,
            })}
          >
            {[
              "welcome",
              "fontSize",
              "hitoride",
              "minnaDe",
              "myPage",
              "cta",
            ].map((name, i) => (
              <div
                key={name}
                className={`${styles.dot} ${i === step ? styles.dotActive : styles.dotInactive}`}
              />
            ))}
          </nav>

          {!isLastStep ? (
            <button
              type="button"
              className={styles.skipButton}
              onClick={handleSkip}
            >
              {t("skip")}
            </button>
          ) : (
            <div className={styles.skipPlaceholder} />
          )}
        </div>

        {/* Content */}
        <div className={contentClassName}>{steps[step]}</div>

        {/* Footer */}
        {!isLastStep && (
          <div className={styles.footer}>
            <button type="button" className={styles.nextButton} onClick={next}>
              <span className={styles.nextButtonText}>
                {step === 0 ? t("start") : t("next")}
              </span>
              <AikinoteRightArrow size={16} color="var(--white)" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
