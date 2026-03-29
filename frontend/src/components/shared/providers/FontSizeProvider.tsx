"use client";

import { type ReactNode, useEffect } from "react";
import { useFontSizeStore } from "@/stores/fontSizeStore";

interface FontSizeProviderProps {
  children: ReactNode;
}

export function FontSizeProvider({ children }: FontSizeProviderProps) {
  const fontSize = useFontSizeStore((s) => s.fontSize);

  useEffect(() => {
    // htmlタグにdata-font-size属性を設定
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  return <>{children}</>;
}
