/**
 * GlobalFetchIndicator のテスト
 * 初回ロードの取得だけバーを出し、キャッシュ済みデータの裏での再取得（ポーリング等）では出さないことを検証する
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalFetchIndicator } from "./GlobalFetchIndicator";

const renderIndicator = (client: QueryClient) =>
  render(
    <QueryClientProvider client={client}>
      <GlobalFetchIndicator />
    </QueryClientProvider>,
  );

describe("GlobalFetchIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("データが無いクエリの取得が300ms以上続いた場合、バーを表示する", async () => {
    // Arrange
    const client = new QueryClient();
    const { container } = renderIndicator(client);

    // Act
    act(() => {
      void client.prefetchQuery({
        queryKey: ["initial"],
        queryFn: () => new Promise(() => {}),
      });
    });
    // React Query の購読者への通知を先に流してから、表示遅延の 300ms を進める
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Assert
    expect(container.firstChild).not.toBeNull();
  });

  it("データが無いクエリでも300ms以内に終われば、バーを表示しない", async () => {
    // Arrange
    const client = new QueryClient();
    const { container } = renderIndicator(client);

    // Act
    await act(async () => {
      await client.prefetchQuery({
        queryKey: ["fast"],
        queryFn: async () => "done",
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Assert
    expect(container.firstChild).toBeNull();
  });

  it("キャッシュ済みデータの裏での再取得では、バーを表示しない", async () => {
    // Arrange
    const client = new QueryClient();
    client.setQueryData(["notifications"], 3);
    const { container } = renderIndicator(client);

    // Act
    act(() => {
      void client.fetchQuery({
        queryKey: ["notifications"],
        queryFn: () => new Promise(() => {}),
        staleTime: 0,
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Assert
    expect(container.firstChild).toBeNull();
  });
});
