import type { ComponentPropsWithoutRef } from "react";

interface ChevronLeftProps extends ComponentPropsWithoutRef<"svg"> {
  size?: number;
}

export function ChevronLeft({ size = 24, ...props }: ChevronLeftProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}