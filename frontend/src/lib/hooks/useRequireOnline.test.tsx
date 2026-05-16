// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRequireOnline } from "./useRequireOnline";

const showToastMock = vi.fn();

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const messages = {
  offlineGuard: {
    actionRequiresNetwork: "この操作はネットに接続してからお試しください",
  },
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="ja" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

const setOnlineForTest = (online: boolean) => {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
  window.dispatchEvent(new Event(online ? "online" : "offline"));
};

describe("useRequireOnline", () => {
  beforeEach(() => {
    showToastMock.mockReset();
  });

  afterEach(() => {
    setOnlineForTest(true);
  });

  it("オンライン時は true を返して Toast を出さない", () => {
    // Arrange
    setOnlineForTest(true);
    const { result } = renderHook(() => useRequireOnline(), { wrapper });

    // Act
    let ok = false;
    act(() => {
      ok = result.current();
    });

    // Assert
    expect(ok).toBe(true);
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("オフライン時は false を返して Toast を出す", () => {
    // Arrange
    const { result, rerender } = renderHook(() => useRequireOnline(), {
      wrapper,
    });
    act(() => {
      setOnlineForTest(false);
    });
    rerender();

    // Act
    let ok = true;
    act(() => {
      ok = result.current();
    });

    // Assert
    expect(ok).toBe(false);
    expect(showToastMock).toHaveBeenCalledWith(
      "この操作はネットに接続してからお試しください",
      "info",
    );
  });
});
