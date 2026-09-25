/**
 * NativeNavigationBridge のテスト
 * ネイティブアプリのタブ等からクライアント遷移できること、アプリ外への遷移を拒否すること、
 * パス変更をネイティブへ通知することを検証する
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeNavigationBridge } from "./NativeNavigationBridge";

const mockPush = vi.fn();
const mockPrefetch = vi.fn();
let mockPathname = "/ja/personal/pages";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, prefetch: mockPrefetch }),
  usePathname: () => mockPathname,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ja",
}));

type TestWindow = Window & {
  __AIKINOTE_NATIVE_APP__?: boolean;
  __aikinoteNavigate?: (path: string) => boolean;
  ReactNativeWebView?: { postMessage: (msg: string) => void };
};

const testWindow = window as TestWindow;
const mockPostMessage = vi.fn();

describe("NativeNavigationBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/ja/personal/pages";
    testWindow.__AIKINOTE_NATIVE_APP__ = true;
    testWindow.ReactNativeWebView = { postMessage: mockPostMessage };
  });

  afterEach(() => {
    delete testWindow.__AIKINOTE_NATIVE_APP__;
    delete testWindow.ReactNativeWebView;
    delete testWindow.__aikinoteNavigate;
  });

  it("ネイティブアプリでは __aikinoteNavigate でクライアント遷移できる", () => {
    // Arrange
    render(<NativeNavigationBridge />);

    // Act
    const result = testWindow.__aikinoteNavigate?.("/ja/mypage");

    // Assert
    expect(result).toBe(true);
    expect(mockPush).toHaveBeenCalledWith("/ja/mypage");
  });

  it.each([
    "https://example.com/phishing",
    "//example.com/phishing",
    "javascript:alert(1)",
  ])("アプリ外のパス（%s）への遷移は拒否する", (path) => {
    // Arrange
    render(<NativeNavigationBridge />);

    // Act
    const result = testWindow.__aikinoteNavigate?.(path);

    // Assert
    expect(result).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("タブの主要画面を先読みする", () => {
    // Act
    render(<NativeNavigationBridge />);

    // Assert
    expect(mockPrefetch).toHaveBeenCalledWith("/ja/personal/pages");
    expect(mockPrefetch).toHaveBeenCalledWith("/ja/social/posts");
    expect(mockPrefetch).toHaveBeenCalledWith("/ja/mypage");
  });

  it("パスが変わるたびに ROUTE_CHANGED をネイティブへ送る", () => {
    // Arrange
    const { rerender } = render(<NativeNavigationBridge />);
    mockPostMessage.mockClear();

    // Act
    mockPathname = "/ja/social/posts";
    rerender(<NativeNavigationBridge />);

    // Assert
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const message = JSON.parse(mockPostMessage.mock.calls[0][0]);
    expect(message.type).toBe("ROUTE_CHANGED");
    expect(message.payload.url).toBe(window.location.href);
  });

  it("アンマウント時にブリッジを解除する", () => {
    // Arrange
    const { unmount } = render(<NativeNavigationBridge />);

    // Act
    unmount();

    // Assert
    expect(testWindow.__aikinoteNavigate).toBeUndefined();
  });

  it("ブラウザ（ネイティブアプリ外）ではブリッジを公開せず、通知も送らない", () => {
    // Arrange
    delete testWindow.__AIKINOTE_NATIVE_APP__;

    // Act
    render(<NativeNavigationBridge />);

    // Assert
    expect(testWindow.__aikinoteNavigate).toBeUndefined();
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(mockPrefetch).not.toHaveBeenCalled();
  });
});
