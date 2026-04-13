import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPage,
  getTrainingDatesMonth,
  removeTrainingDateAttendance,
  upsertTrainingDateAttendance,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { PersonalCalendar } from "./PersonalCalendar";

const mockPush = vi.fn();
vi.mock("@/lib/i18n/routing", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: vi.fn() })),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  getTrainingDatesMonth: vi.fn(),
  upsertTrainingDateAttendance: vi.fn(),
  removeTrainingDateAttendance: vi.fn(),
  createPage: vi.fn(),
  createAttachment: vi.fn(),
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock(
  "@/components/features/personal/PageCreateModal/PageCreateModal",
  () => ({
    PageCreateModal: ({
      isOpen,
      onClose,
      onSave,
    }: {
      isOpen: boolean;
      onClose: () => void;
      onSave: (pageData: {
        title: string;
        content: string;
        tori: string[];
        uke: string[];
        waza: string[];
        attachments: unknown[];
      }) => void;
    }) =>
      isOpen ? (
        <div>
          <button
            type="button"
            onClick={() =>
              onSave({
                title: "新規ページ",
                content: "本文",
                tori: [],
                uke: [],
                waza: [],
                attachments: [],
              })
            }
          >
            SavePage
          </button>
          <button type="button" onClick={onClose}>
            CloseModal
          </button>
        </div>
      ) : null,
  }),
);

describe("カレンダー画面", () => {
  const mockUseAuth = vi.mocked(useAuth);
  const mockGetTrainingDatesMonth = vi.mocked(getTrainingDatesMonth);
  const mockUpsertAttendance = vi.mocked(upsertTrainingDateAttendance);
  const mockRemoveAttendance = vi.mocked(removeTrainingDateAttendance);
  const mockCreatePage = vi.mocked(createPage);

  const FAKE_NOW = new Date(2026, 2, 25, 12, 0, 0);

  const currentMonthDate20 = () => {
    return "2026-03-20";
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(FAKE_NOW);
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: "test-user-id",
        email: "test@example.com",
        username: "testuser",
        profile_image_url: null,
      },
      loading: false,
      isInitializing: false,
      isProcessing: false,
      error: null,
      signUp: vi.fn(),
      signInWithCredentials: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      verifyEmail: vi.fn(),
      clearError: vi.fn(),
    });

    mockGetTrainingDatesMonth.mockResolvedValue({
      success: true,
      data: {
        training_dates: [],
        page_counts: [],
      },
    });

    mockUpsertAttendance.mockResolvedValue({
      success: true,
      data: {
        id: "td-1",
        user_id: "test-user-id",
        training_date: currentMonthDate20(),
        is_attended: true,
        created_at: `${currentMonthDate20()}T00:00:00.000Z`,
      },
    });
    mockRemoveAttendance.mockResolvedValue({
      success: true,
      message: "稽古参加日を削除しました",
    });
    mockCreatePage.mockResolvedValue({
      success: true,
      data: {
        page: {
          id: "page-1",
          title: "新規ページ",
          content: "本文",
          user_id: "test-user-id",
          created_at: `${currentMonthDate20()}T00:00:00.000Z`,
          updated_at: `${currentMonthDate20()}T00:00:00.000Z`,
        },
        tags: [],
      },
    });
  });

  it("カレンダー画面が表示されること", async () => {
    // Arrange & Act
    render(
      <I18nTestProvider>
        <PersonalCalendar />
      </I18nTestProvider>,
    );

    // Assert
    await waitFor(() => {
      const now = new Date();
      expect(mockGetTrainingDatesMonth).toHaveBeenCalledWith({
        userId: "test-user-id",
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
    });
    expect(
      screen.getByText("選択した日付の稽古参加記録やページ作成が可能です"),
    ).toBeInTheDocument();
  });

  it("未参加日のタップで参加登録を実行できること", async () => {
    // Arrange
    const user = userEvent.setup();
    const expectedDate = currentMonthDate20();
    render(
      <I18nTestProvider>
        <PersonalCalendar />
      </I18nTestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
    });

    // Act
    await user.click(screen.getByRole("button", { name: "20" }));
    await user.click(
      screen.getByRole("button", { name: "稽古に参加しました" }),
    );

    // Assert
    expect(mockUpsertAttendance).toHaveBeenCalledWith({
      userId: "test-user-id",
      trainingDate: expectedDate,
    });
  });

  it("参加済み日のタップで稽古参加を取り消しを実行できること", async () => {
    // Arrange
    const user = userEvent.setup();
    const expectedDate = currentMonthDate20();
    mockGetTrainingDatesMonth.mockResolvedValue({
      success: true,
      data: {
        training_dates: [
          {
            id: "td-1",
            user_id: "test-user-id",
            training_date: expectedDate,
            is_attended: true,
            created_at: `${expectedDate}T00:00:00.000Z`,
          },
        ],
        page_counts: [],
      },
    });

    render(
      <I18nTestProvider>
        <PersonalCalendar />
      </I18nTestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
    });

    // Act
    await user.click(screen.getByRole("button", { name: "20" }));
    await user.click(
      screen.getByRole("button", { name: "稽古参加を取り消し" }),
    );

    // Assert
    expect(mockRemoveAttendance).toHaveBeenCalledWith({
      userId: "test-user-id",
      trainingDate: expectedDate,
    });
  });

  it("選択日付からページ作成ボタンを押すと作成ページに遷移すること", async () => {
    // Arrange
    const user = userEvent.setup();
    const expectedDate = currentMonthDate20();

    render(
      <I18nTestProvider>
        <PersonalCalendar />
      </I18nTestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
    });

    // Act
    await user.click(screen.getByRole("button", { name: "20" }));
    await user.click(screen.getByRole("button", { name: "ページ作成" }));

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(`/personal/pages/new?date=${expectedDate}`),
      );
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("returnUrl="),
      );
    });
  });
});
