import type { CSSProperties, FC } from "react";

interface AikinoteRightArrowProps {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export const AikinoteRightArrow: FC<AikinoteRightArrowProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => {
  const height = (size * 7) / 18;

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 18 7"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M0 5.68408H15L10.3125 0.684082" stroke={color} strokeWidth="2" />
    </svg>
  );
};
