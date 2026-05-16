// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const mockSignOutUser = vi.fn();
vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({ signOutUser: mockSignOutUser }),
}));

const useSubscriptionMock = vi.fn(() => ({ isPremium: false, loading: false }));
vi.mock("@/lib/hooks/useSubscription", () => ({
  useSubscription: () => useSubscriptionMock(),
}));

const mockShowToast = vi.fn();
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock("@/components/shared/layouts/MinimalLayout", () => ({
  MinimalLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { AccountDeletionSetting } from "./AccountDeletionSetting";

describe("AccountDeletionSetting", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSignOutUser.mockReset();
    mockShowToast.mockReset();
    useSubscriptionMock.mockReturnValue({ isPremium: false, loading: false });
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("同意チェック OFF 時は削除ボタン disabled", () => {
    // Arrange & Act
    render(<AccountDeletionSetting locale="ja" />);

    // Assert
    const button = screen.getByRole("button", {
      name: "accountDeletion.deleteButton",
    });
    expect(button).toBeDisabled();
  });

  it("同意チェック ON で削除ボタン active、押下で ConfirmDialog 表示", () => {
    // Arrange
    render(<AccountDeletionSetting locale="ja" />);

    // Act
    fireEvent.click(screen.getByRole("checkbox"));

    // Assert
    const button = screen.getByRole("button", {
      name: "accountDeletion.deleteButton",
    });
    expect(button).not.toBeDisabled();

    // Act: ボタン押下
    fireEvent.click(button);

    // Assert: ConfirmDialog が表示される
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("accountDeletion.confirmTitle"),
    ).toBeInTheDocument();
  });

  it("ConfirmDialog の confirm で fetch DELETE /api/account → router.replace", async () => {
    // Arrange
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    mockSignOutUser.mockResolvedValueOnce(undefined);

    render(<AccountDeletionSetting locale="ja" />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "accountDeletion.deleteButton" }),
    );

    // Act
    fireEvent.click(
      screen.getByRole("button", { name: "accountDeletion.confirmAction" }),
    );

    // Assert
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/account", {
        method: "DELETE",
      });
      expect(mockSignOutUser).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/ja/login?deleted=1");
    });
  });

  it("API 失敗時はトーストでエラー表示し replace されない", async () => {
    // Arrange
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "サーバーエラー" }),
    });

    render(<AccountDeletionSetting locale="ja" />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "accountDeletion.deleteButton" }),
    );

    // Act
    fireEvent.click(
      screen.getByRole("button", { name: "accountDeletion.confirmAction" }),
    );

    // Assert
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("サーバーエラー", "error");
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it("Premium 加入中はサブスクリプション警告を表示", () => {
    // Arrange
    useSubscriptionMock.mockReturnValueOnce({
      isPremium: true,
      loading: false,
    });

    // Act
    render(<AccountDeletionSetting locale="ja" />);

    // Assert
    expect(
      screen.getByText("accountDeletion.subscriptionWarning"),
    ).toBeInTheDocument();
  });
});
