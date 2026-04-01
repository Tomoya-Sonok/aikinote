import { useCallback, useState } from "react";
import { type FontSize, useFontSizeStore } from "@/stores/fontSizeStore";

const TOTAL_STEPS = 6;

export function useTutorialState() {
  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState(1);

  const globalFontSize = useFontSizeStore((s) => s.fontSize);
  const setGlobalFontSize = useFontSizeStore((s) => s.setFontSize);
  const [localFontSize, setLocalFontSize] = useState<FontSize>(globalFontSize);

  const isLastStep = step === TOTAL_STEPS - 1;

  const goTo = useCallback(
    (nextStep: number) => {
      if (transitioning || nextStep === step) return;
      setDirection(nextStep > step ? 1 : -1);
      setTransitioning(true);
      setTimeout(() => {
        setStep(nextStep);
        setTimeout(() => setTransitioning(false), 50);
      }, 220);
    },
    [transitioning, step],
  );

  const next = useCallback(() => {
    if (step < TOTAL_STEPS - 1) goTo(step + 1);
  }, [step, goTo]);

  const prev = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  const skipToEnd = useCallback(() => {
    goTo(TOTAL_STEPS - 1);
  }, [goTo]);

  const handleFontSizeChange = useCallback(
    (size: FontSize) => {
      setLocalFontSize(size);
      setGlobalFontSize(size);
    },
    [setGlobalFontSize],
  );

  return {
    step,
    totalSteps: TOTAL_STEPS,
    transitioning,
    direction,
    isLastStep,
    fontSize: localFontSize,
    next,
    prev,
    skipToEnd,
    handleFontSizeChange,
  };
}
