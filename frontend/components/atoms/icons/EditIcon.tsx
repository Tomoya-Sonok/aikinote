import type { ComponentPropsWithoutRef } from "react";

interface EditIconProps extends ComponentPropsWithoutRef<"svg"> {
  size?: number;
  title?: string;
}

export function EditIcon({
  size = 16,
  title = "Edit icon",
  ...props
}: EditIconProps) {
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
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}
