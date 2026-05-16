// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetBridgeForTest } from "@/lib/api/native-bridge";
import { useSyncQueryInvalidator } from "./useSyncQueryInvalidator";

const useIsNativeAppMock = vi.fn<() => boolean>(() => true);
vi.mock("@/lib/hooks/useIsNativeApp", () => ({
  useIsNativeApp: () => useIsNativeAppMock(),
}));

interface TestWindow {
  __onNativeMessage?: (msg: unknown) => void;
}
const getTestWindow = (): TestWindow => window as unknown as TestWindow;

function emitSyncStatus(payload: unknown) {
  getTestWindow().__onNativeMessage?.({
    type: "PERSONAL_SYNC_STATUS",
    payload,
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useSyncQueryInvalidator", () => {
  let queryClient: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetBridgeForTest();
    delete getTestWindow().__onNativeMessage;
    useIsNativeAppMock.mockReturnValue(true);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: Number.POSITIVE_INFINITY, retry: false },
      },
    });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    invalidateSpy.mockRestore();
    _resetBridgeForTest();
    delete getTestWindow().__onNativeMessage;
  });

  it("Native + completed/full で 7 種類の queryKey を invalidate する", () => {
    // Arrange
    renderHook(() => useSyncQueryInvalidator(), {
      wrapper: createWrapper(queryClient),
    });

    // Act
    act(() => {
      emitSyncStatus({ state: "completed", scope: "full" });
    });

    // Assert
    expect(invalidateSpy).toHaveBeenCalledTimes(7);
    const calledKeys = invalidateSpy.mock.calls.map(
      ([arg]) => (arg as { queryKey: string[] }).queryKey[0],
    );
    expect(calledKeys).toEqual([
      "training-pages",
      "training-pages-unfiltered-count",
      "training-tags",
      "training-categories",
      "training-stats",
      "page-detail",
      "page-attachments",
    ]);
  });

  it("scope: 'push-only' では invalidate されない", () => {
    // Arrange
    renderHook(() => useSyncQueryInvalidator(), {
      wrapper: createWrapper(queryClient),
    });

    // Act
    act(() => {
      emitSyncStatus({ state: "completed", scope: "push-only" });
    });

    // Assert
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("state: 'running' / 'failed' では invalidate されない", () => {
    // Arrange
    renderHook(() => useSyncQueryInvalidator(), {
      wrapper: createWrapper(queryClient),
    });

    // Act
    act(() => {
      emitSyncStatus({ state: "running", scope: "full" });
    });
    act(() => {
      emitSyncStatus({ state: "failed", scope: "full", error: "any" });
    });

    // Assert
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("isNative=false ならリスナーを登録せず invalidate も発火しない", () => {
    // Arrange
    useIsNativeAppMock.mockReturnValue(false);
    renderHook(() => useSyncQueryInvalidator(), {
      wrapper: createWrapper(queryClient),
    });

    // Act
    act(() => {
      emitSyncStatus({ state: "completed", scope: "full" });
    });

    // Assert
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("unmount でリスナーが解除される", () => {
    // Arrange
    const { unmount } = renderHook(() => useSyncQueryInvalidator(), {
      wrapper: createWrapper(queryClient),
    });
    unmount();

    // Act
    act(() => {
      emitSyncStatus({ state: "completed", scope: "full" });
    });

    // Assert
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
