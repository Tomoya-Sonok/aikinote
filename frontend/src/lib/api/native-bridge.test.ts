// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetBridgeForTest,
  BridgeCallError,
  callPersonalBridge,
  isNativeApp,
} from "./native-bridge";

interface BridgeTestWindow {
  __AIKINOTE_NATIVE_APP__?: boolean;
  __onNativeMessage?: (msg: unknown) => void;
  ReactNativeWebView?: { postMessage: (msg: string) => void };
}

const getTestWindow = (): BridgeTestWindow =>
  window as unknown as BridgeTestWindow;

describe("isNativeApp", () => {
  afterEach(() => {
    delete getTestWindow().__AIKINOTE_NATIVE_APP__;
    _resetBridgeForTest();
  });

  it("__AIKINOTE_NATIVE_APP__ が true なら true を返す", () => {
    // Arrange
    getTestWindow().__AIKINOTE_NATIVE_APP__ = true;

    // Act & Assert
    expect(isNativeApp()).toBe(true);
  });

  it("__AIKINOTE_NATIVE_APP__ が未設定なら false", () => {
    // Arrange
    delete getTestWindow().__AIKINOTE_NATIVE_APP__;

    // Act & Assert
    expect(isNativeApp()).toBe(false);
  });
});

describe("callPersonalBridge", () => {
  beforeEach(() => {
    _resetBridgeForTest();
    getTestWindow().__AIKINOTE_NATIVE_APP__ = true;
    delete getTestWindow().__onNativeMessage;
  });

  afterEach(() => {
    delete getTestWindow().__AIKINOTE_NATIVE_APP__;
    delete getTestWindow().__onNativeMessage;
    delete getTestWindow().ReactNativeWebView;
    _resetBridgeForTest();
  });

  it("Native 環境外では NOT_IN_NATIVE_APP エラーで reject", async () => {
    // Arrange
    delete getTestWindow().__AIKINOTE_NATIVE_APP__;

    // Act & Assert
    await expect(callPersonalBridge("PERSONAL_PAGES_LIST")).rejects.toThrow(
      BridgeCallError,
    );
  });

  it("ReactNativeWebView が無いと NO_BRIDGE で reject", async () => {
    // Arrange
    delete getTestWindow().ReactNativeWebView;

    // Act
    const promise = callPersonalBridge("PERSONAL_PAGES_LIST");

    // Assert
    await expect(promise).rejects.toMatchObject({ code: "NO_BRIDGE" });
  });

  it("Native 側が ok:true で返したら data を resolve", async () => {
    // Arrange
    const postMessage = vi.fn((message: string) => {
      const parsed = JSON.parse(message) as { requestId: string };
      // 同期的に __onNativeMessage を呼んで成功レスポンスを返す
      getTestWindow().__onNativeMessage?.({
        type: "PERSONAL_PAGES_LIST_RESULT",
        payload: {
          requestId: parsed.requestId,
          ok: true,
          data: [{ local_id: "page-1", title: "テスト" }],
        },
      });
    });
    getTestWindow().ReactNativeWebView = { postMessage };

    // Act
    const result = await callPersonalBridge<Array<{ local_id: string }>>(
      "PERSONAL_PAGES_LIST",
      { userId: "u1" },
    );

    // Assert
    expect(result).toEqual([{ local_id: "page-1", title: "テスト" }]);
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it("Native 側が ok:false で返したら BridgeCallError で reject", async () => {
    // Arrange
    getTestWindow().ReactNativeWebView = {
      postMessage: (message: string) => {
        const parsed = JSON.parse(message) as { requestId: string };
        getTestWindow().__onNativeMessage?.({
          type: "PERSONAL_PAGES_GET_RESULT",
          payload: {
            requestId: parsed.requestId,
            ok: false,
            error: { code: "NOT_FOUND", message: "page missing" },
          },
        });
      },
    };

    // Act
    const promise = callPersonalBridge("PERSONAL_PAGES_GET", {
      pageId: "x",
    });

    // Assert
    await expect(promise).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "page missing",
    });
  });

  it("既存の __onNativeMessage は PERSONAL 以外のメッセージで温存される", async () => {
    // Arrange
    const existingHandler = vi.fn();
    getTestWindow().__onNativeMessage = existingHandler;
    getTestWindow().ReactNativeWebView = {
      postMessage: (message: string) => {
        const parsed = JSON.parse(message) as { requestId: string };
        getTestWindow().__onNativeMessage?.({
          type: "PERSONAL_PAGES_LIST_RESULT",
          payload: { requestId: parsed.requestId, ok: true, data: [] },
        });
      },
    };

    // Act
    await callPersonalBridge("PERSONAL_PAGES_LIST");
    // 既存 IAP/OAuth メッセージのシミュレーション
    getTestWindow().__onNativeMessage?.({
      type: "IAP_RESULT",
      payload: { success: true },
    });

    // Assert
    expect(existingHandler).toHaveBeenCalledWith({
      type: "IAP_RESULT",
      payload: { success: true },
    });
  });

  it("タイムアウト後は TIMEOUT エラー", async () => {
    // Arrange
    vi.useFakeTimers();
    getTestWindow().ReactNativeWebView = { postMessage: vi.fn() };

    // Act
    const promise = callPersonalBridge(
      "PERSONAL_PAGES_LIST",
      {},
      {
        timeoutMs: 100,
      },
    );
    vi.advanceTimersByTime(101);

    // Assert
    await expect(promise).rejects.toMatchObject({ code: "TIMEOUT" });

    vi.useRealTimers();
  });
});
