"use client";

// ネイティブアプリ (Expo WebView) との Promise ベースブリッジ。
//
// Native 側仕様: aikinote-native-app/docs/webview-bridge-protocol.md
// Native 側 dispatcher: aikinote-native-app/lib/bridge/personal-handlers.ts
//
// 既存の IAP / OAuth で確立済みの window.__onNativeMessage パターンを尊重しつつ、
// PERSONAL_*_RESULT メッセージだけは requestId ベースの自前 Promise resolver に
// 流す。__onNativeMessage 自体は Native 側の WebView injection (aikinote-webview.tsx)
// で定義されるため、本モジュールはその関数を「ラップ」して先頭に判定を入れる
// (既存 IAP/OAuth resolver は wrapped prev に委譲)。
//
// 本 PR (PR3) では:
//   - call 関数は実装するが、フックからの呼び出し配線は PR6 (初回フルプル完成時) に集約
//   - 後続 PR が import するだけで使える状態にする

interface BridgeErrorPayload {
  code: string;
  message: string;
}

interface BridgeResponseOk<T> {
  requestId: string;
  ok: true;
  data: T;
}

interface BridgeResponseErr {
  requestId: string;
  ok: false;
  error?: BridgeErrorPayload;
}

type BridgeResponse<T> = BridgeResponseOk<T> | BridgeResponseErr;

interface NativeMessage {
  type?: unknown;
  payload?: unknown;
}

type NativeMessageHandler = (msg: NativeMessage) => void;

interface NativeWindow {
  __AIKINOTE_NATIVE_APP__?: boolean;
  __onNativeMessage?: NativeMessageHandler;
  ReactNativeWebView?: { postMessage: (message: string) => void };
}

declare global {
  interface Window {
    __AIKINOTE_NATIVE_APP__?: boolean;
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

export class BridgeCallError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "BridgeCallError";
    this.code = code;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

type PendingResolver = (response: BridgeResponse<unknown>) => void;
const pending = new Map<string, PendingResolver>();
let handlerInstalled = false;

// PERSONAL_SYNC_STATUS の back-channel 通知 (Native → Web) を受け取るリスナ。
// SyncStatusBanner など UI 側で addSyncStatusListener を購読する。
export interface SyncStatusPayload {
  state: "idle" | "running" | "completed" | "failed";
  scope?: "full" | "incremental" | "push-only";
  pending?: number;
  error?: string;
}
type SyncStatusListener = (status: SyncStatusPayload) => void;
const syncStatusListeners = new Set<SyncStatusListener>();

export function addSyncStatusListener(
  listener: SyncStatusListener,
): () => void {
  syncStatusListeners.add(listener);
  installResultHandler();
  return () => {
    syncStatusListeners.delete(listener);
  };
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as NativeWindow).__AIKINOTE_NATIVE_APP__;
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `req_${crypto.randomUUID()}`;
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * window.__onNativeMessage を先頭に「PERSONAL_*_RESULT を pending から resolve」
 * する処理でラップする。既存 handler (IAP / SUBSCRIPTION / OAUTH 等) は
 * prev として保持して引き続き呼ぶ。
 *
 * idempotent: 何度呼ばれても一度だけインストール。
 */
function installResultHandler(): void {
  if (handlerInstalled || typeof window === "undefined") return;
  handlerInstalled = true;

  const win = window as NativeWindow;
  const prev = win.__onNativeMessage;

  win.__onNativeMessage = (msg: NativeMessage) => {
    if (
      typeof msg?.type === "string" &&
      msg.type.startsWith("PERSONAL_") &&
      msg.type.endsWith("_RESULT")
    ) {
      const payload = msg.payload as
        | {
            requestId?: string;
            ok?: boolean;
            data?: unknown;
            error?: BridgeErrorPayload;
          }
        | undefined;
      const requestId = payload?.requestId;
      if (typeof requestId === "string") {
        const resolver = pending.get(requestId);
        if (resolver) {
          pending.delete(requestId);
          resolver(payload as BridgeResponse<unknown>);
          return;
        }
      }
    }

    // PERSONAL_SYNC_STATUS は back-channel (request/response 対ではない)。
    // requestId は無いので、リスナ全員に配信する。
    if (msg?.type === "PERSONAL_SYNC_STATUS") {
      const status = msg.payload as SyncStatusPayload | undefined;
      if (status) {
        // Array.from で snapshot を作って iterate (TS の downlevelIteration 警告を回避)
        for (const listener of Array.from(syncStatusListeners)) {
          try {
            listener(status);
          } catch (error) {
            console.warn("[native-bridge] SyncStatusListener エラー:", error);
          }
        }
      }
      return;
    }

    // PERSONAL 以外 (IAP / SUBSCRIPTION_STATUS / OAUTH_RESULT 等) は既存 handler に委譲
    if (typeof prev === "function") {
      prev(msg);
    }
  };
}

interface CallBridgeOptions {
  timeoutMs?: number;
}

/**
 * PERSONAL_* メッセージを Native 側へ送り、レスポンスを Promise で待つ。
 * Native 環境以外で呼ぶと NOT_IN_NATIVE_APP エラー。
 */
export async function callPersonalBridge<T = unknown>(
  type: string,
  payload: Record<string, unknown> = {},
  options: CallBridgeOptions = {},
): Promise<T> {
  if (!isNativeApp()) {
    throw new BridgeCallError(
      "NOT_IN_NATIVE_APP",
      "callPersonalBridge は Native WebView 環境でのみ利用できます。",
    );
  }
  const win = window as NativeWindow;
  if (!win.ReactNativeWebView) {
    throw new BridgeCallError(
      "NO_BRIDGE",
      "window.ReactNativeWebView が利用できません。",
    );
  }

  installResultHandler();

  const requestId = generateRequestId();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.delete(requestId)) {
        reject(
          new BridgeCallError(
            "TIMEOUT",
            `Bridge call ${type} timed out after ${timeoutMs}ms`,
          ),
        );
      }
    }, timeoutMs);

    pending.set(requestId, (response) => {
      clearTimeout(timer);
      if (response.ok) {
        resolve(response.data as T);
      } else {
        reject(
          new BridgeCallError(
            response.error?.code ?? "UNKNOWN",
            response.error?.message ?? `Bridge call ${type} failed.`,
          ),
        );
      }
    });

    try {
      win.ReactNativeWebView!.postMessage(
        JSON.stringify({ type, requestId, payload }),
      );
    } catch (error) {
      pending.delete(requestId);
      clearTimeout(timer);
      reject(
        new BridgeCallError(
          "POST_MESSAGE_FAILED",
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  });
}

/**
 * テスト用: pending map と handler 状態をリセット。
 */
export function _resetBridgeForTest(): void {
  pending.clear();
  syncStatusListeners.clear();
  handlerInstalled = false;
}
