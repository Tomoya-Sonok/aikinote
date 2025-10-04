import type { ComponentPropsWithoutRef } from "react";

interface TrashIconProps extends ComponentPropsWithoutRef<"svg"> {
  size?: number;
  title?: string;
}

export function TrashIcon({
  size = 16,
  title = "Trash icon",
  ...props
}: TrashIconProps) {
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
      <path d="m3 6 3 0" />
      <path d="m19 6-3 0" />
      <path d="m8 6 0-2c0-1 1-2 2-2h4c1 0 2 1 2 2l0 2" />
      <path d="m4 6 1 14c0 1 1 2 2 2h10c1 0 2-1 2-2l1-14" />
      <path d="m10 11 0 6" />
      <path d="m14 11 0 6" />
    </svg>
  );
}
