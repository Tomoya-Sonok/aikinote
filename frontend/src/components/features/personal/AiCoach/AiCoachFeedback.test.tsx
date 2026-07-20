/**
 * AiCoachFeedback のテスト
 * フィードバック選択時の API 呼び出しと、成功/失敗/多重送信防止の挙動を検証する
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import * as aiCoachApi from "@/lib/api/aiCoach";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { AiCoachFeedback } from "./AiCoachFeedback";

const feedbackMessages = {
  aiCoach: {
    feedback: {
      prompt: "AIコーチはいかがでしたか？",
      good: "役に立つ！",
      neutral: "何とも言えない",
      bad: "イマイチ...",
      thanks: "フィードバックありがとうございます！",
      failed: "フィードバックの送信に失敗しました",
    },
  },
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nTestProvider messages={feedbackMessages}>{children}</I18nTestProvider>
);

const mockShowToast = vi.fn();
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockTrack = vi.fn();
vi.mock("@/lib/hooks/useUmamiTrack", () => ({
  useUmamiTrack: () => ({ track: mockTrack }),
}));

vi.mock("@/lib/api/aiCoach", () => ({
  submitConversationFeedback: vi.fn(),
}));

describe("AiCoachFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("「役に立つ！」を押下すると feedback=good で API がコールされ、成功トースト表示と onCompleted 呼び出しが行われる", async () => {
    // Arrange
    (aiCoachApi.submitConversationFeedback as Mock).mockResolvedValue(
      undefined,
    );
    const onCompleted = vi.fn();
    render(
      <AiCoachFeedback conversationId="conv-1" onCompleted={onCompleted} />,
      { wrapper: Wrapper },
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "役に立つ！" }));

    // Assert
    await waitFor(() => {
      expect(aiCoachApi.submitConversationFeedback).toHaveBeenCalledWith(
        "conv-1",
        "good",
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "フィードバックありがとうございます！",
        "success",
      );
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });
  });

  it("「何とも言えない」「イマイチ...」はそれぞれ neutral / bad で API がコールされる", async () => {
    // Arrange
    (aiCoachApi.submitConversationFeedback as Mock).mockResolvedValue(
      undefined,
    );
    const { unmount } = render(
      <AiCoachFeedback conversationId="conv-1" onCompleted={vi.fn()} />,
      { wrapper: Wrapper },
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "何とも言えない" }));

    // Assert
    await waitFor(() => {
      expect(aiCoachApi.submitConversationFeedback).toHaveBeenCalledWith(
        "conv-1",
        "neutral",
      );
    });

    // Arrange: 再マウントして bad も検証
    unmount();
    (aiCoachApi.submitConversationFeedback as Mock).mockClear();
    render(<AiCoachFeedback conversationId="conv-2" onCompleted={vi.fn()} />, {
      wrapper: Wrapper,
    });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "イマイチ..." }));

    // Assert
    await waitFor(() => {
      expect(aiCoachApi.submitConversationFeedback).toHaveBeenCalledWith(
        "conv-2",
        "bad",
      );
    });
  });

  it("API が失敗した場合はエラートーストを表示し、onCompleted は呼ばれない（再回答可能なまま）", async () => {
    // Arrange
    (aiCoachApi.submitConversationFeedback as Mock).mockRejectedValue(
      new Error("network error"),
    );
    const onCompleted = vi.fn();
    render(
      <AiCoachFeedback conversationId="conv-1" onCompleted={onCompleted} />,
      { wrapper: Wrapper },
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "イマイチ..." }));

    // Assert
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "フィードバックの送信に失敗しました",
        "error",
      );
    });
    expect(onCompleted).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "役に立つ！" }),
    ).not.toBeDisabled();
  });

  it("送信中に連打しても API は1回しかコールされない", async () => {
    // Arrange: API を未解決のまま保留にする
    let resolveSubmit: () => void = () => {};
    (aiCoachApi.submitConversationFeedback as Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const onCompleted = vi.fn();
    render(
      <AiCoachFeedback conversationId="conv-1" onCompleted={onCompleted} />,
      { wrapper: Wrapper },
    );

    // Act: 同じボタンを連打 + 別のボタンも押下
    const goodButton = screen.getByRole("button", { name: "役に立つ！" });
    fireEvent.click(goodButton);
    fireEvent.click(goodButton);
    fireEvent.click(screen.getByRole("button", { name: "何とも言えない" }));

    // Assert: 保留中は1回のみ
    expect(aiCoachApi.submitConversationFeedback).toHaveBeenCalledTimes(1);

    // Act: 解決させる
    resolveSubmit();

    // Assert
    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });
  });
});
