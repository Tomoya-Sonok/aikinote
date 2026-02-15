import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPage, getPages, getTags } from "@/lib/api/client";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { PersonalPagesPage } from "./PersonalPagesPage";

// useAuth をモック
vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-123",
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
  }),
}));

// next/navigation をモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// API クライアントをモック
vi.mock("@/lib/api/client");

// ToastContext をモック
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// TabNavigation をモック
vi.mock("@/components/shared/TabNavigation/TabNavigation", () => ({
  TabNavigation: () => <div data-testid="tab-navigation" />,
}));

// FloatingActionButton をモック
vi.mock("@/components/shared/FloatingActionButton/FloatingActionButton", () => ({
  FloatingActionButton: ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      data-testid="floating-action-button"
      onClick={onClick}
    >
      Add
    </button>
  ),
}));

// TrainingCard をモック
vi.mock("@/components/features/personal/TrainingCard/TrainingCard", () => ({
  TrainingCard: ({
    title,
    onClick,
  }: {
    title: string;
    onClick: () => void;
  }) => (
    <button type="button" data-testid="training-card" onClick={onClick}>
      <h3>{title}</h3>
    </button>
  ),
}));

// PageCreateModal をモック
vi.mock("@/components/features/personal/PageCreateModal/PageCreateModal", () => ({
  PageCreateModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) => (
    <div
      data-testid="page-create-modal"
      style={{ display: isOpen ? "block" : "none" }}
    >
      <button type="button" data-testid="close-modal" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

describe("PersonalPagesPage - クライアントサイドフィルタリング統合テスト", () => {
  const mockTrainingPages = [
    {
      page: {
        id: "page-1",
        title: "React Hooks の基本",
        content: "useStateとuseEffectについて学習",
        created_at: "2024-01-15T10:00:00Z",
      },
      tags: [{ name: "React" }, { name: "JavaScript" }],
    },
    {
      page: {
        id: "page-2",
        title: "TypeScript 入門",
        content: "型安全なコードの書き方",
        created_at: "2024-01-16T10:00:00Z",
      },
      tags: [{ name: "TypeScript" }, { name: "プログラミング" }],
    },
    {
      page: {
        id: "page-3",
        title: "Next.js ルーティング",
        content: "App Routerの使い方について",
        created_at: "2024-01-17T10:00:00Z",
      },
      tags: [{ name: "Next.js" }, { name: "React" }],
    },
  ];

  beforeEach(() => {
    vi.mocked(getPages).mockResolvedValue({
      success: true,
      data: {
        training_pages: mockTrainingPages,
      },
    });

    vi.mocked(getTags).mockResolvedValue({
      success: true,
      data: [
        { name: "React" },
        { name: "TypeScript" },
        { name: "JavaScript" },
        { name: "Next.js" },
        { name: "プログラミング" },
      ],
    });
    vi.mocked(createPage).mockResolvedValue({
      success: true,
      data: {
        page: {
          id: "new-page",
          title: "New Page",
          content: "New Content",
          created_at: new Date().toISOString(),
        },
        tags: [],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ページを初期化すると全件取得でgetPagesAPIが呼ばれる", async () => {
    // Arrange
    render(
      <I18nTestProvider>
        <PersonalPagesPage />
      </I18nTestProvider>,
    );

    // Assert
    await waitFor(() => {
      expect(getPages).toHaveBeenCalledWith({
        userId: "test-user-123",
        limit: 100,
        offset: 0,
        query: "",
        tags: [],
        date: undefined,
      });
    });
  });
});
