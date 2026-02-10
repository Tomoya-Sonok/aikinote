import type { ComponentPropsWithoutRef } from "react";

interface ChevronLeftProps extends ComponentPropsWithoutRef<"svg"> {
  size?: number;
  title?: string;
}

export function ChevronLeft({
  size = 24,
  title = "Chevron left icon",
  ...props
}: ChevronLeftProps) {
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
      <title>{title}</title>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
