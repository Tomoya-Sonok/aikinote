// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { OfflineGuard } from "./OfflineGuard";

const messages = {
  offlineGuard: {
    message: "ネットワークが接続されている状態でしかご利用いただけません",
    retry: "再試行",
  },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("OfflineGuard", () => {
  it("メッセージと再試行ボタンが表示される", () => {
    // Arrange & Act
    renderWithIntl(<OfflineGuard />);

    // Assert
    expect(
      screen.getByText(
        "ネットワークが接続されている状態でしかご利用いただけません",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "再試行" })).toBeTruthy();
  });

  it("onRetry が指定されているとボタン押下で呼ばれる", () => {
    // Arrange
    const onRetry = vi.fn();
    renderWithIntl(<OfflineGuard onRetry={onRetry} />);

    // Act
    screen.getByRole("button", { name: "再試行" }).click();

    // Assert
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
