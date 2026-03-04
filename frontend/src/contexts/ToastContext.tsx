"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { Toast } from "@/components/shared/Toast/Toast";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: "success" | "error" | "info",
    duration?: number,
    className?: string,
    style?: React.CSSProperties,
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
    duration = 3000,
    className = "",
    style?: React.CSSProperties,
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = {
      id,
      message,
      type,
      duration,
      className,
      style,
    };

    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
          className={toast.className}
          style={toast.style}
        />
      ))}
    </ToastContext.Provider>
  );
};
