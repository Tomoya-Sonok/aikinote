import type { CSSProperties } from "react";
import styles from "./StepDots.module.css";

type StepDotState = "active" | "inactive";

interface StepDotsProps {
  states: readonly StepDotState[];
  dotSize?: number;
  activeColor?: string;
  inactiveColor?: string;
}

type StepDotsStyle = CSSProperties & {
  "--step-dot-size"?: string;
  "--step-dot-active-color"?: string;
  "--step-dot-inactive-color"?: string;
};

export function StepDots({
  states,
  dotSize,
  activeColor,
  inactiveColor,
}: StepDotsProps) {
  const style: StepDotsStyle = {};
  const stateCounts: Record<StepDotState, number> = {
    active: 0,
    inactive: 0,
  };

  if (dotSize !== undefined) {
    style["--step-dot-size"] = `${dotSize}px`;
  }
  if (activeColor) {
    style["--step-dot-active-color"] = activeColor;
  }
  if (inactiveColor) {
    style["--step-dot-inactive-color"] = inactiveColor;
  }

  return (
    <div className={styles.stepDots} style={style} aria-hidden="true">
      {states.map((state) => {
        stateCounts[state] += 1;
        const key = `step-dot-${state}-${stateCounts[state]}`;
        const className =
          state === "active"
            ? `${styles.stepDot} ${styles.stepDotActive}`
            : styles.stepDot;

        return <div key={key} className={className} />;
      })}
    </div>
  );
}
