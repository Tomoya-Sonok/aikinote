import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageModal } from "./PageModal";

// next-auth/react をモック
vi.mock("next-auth/react", () => ({
	useSession: () => ({
		data: {
			user: {
				id: "test-user-123",
				email: "test@example.com",
			},
		},
		status: "authenticated",
	}),
}));

// ToastContext をモック
vi.mock("@/contexts/ToastContext", () => ({
	useToast: () => ({
		showToast: vi.fn(),
	}),
}));

// API クライアントをモック
vi.mock("@/lib/api/client", () => ({
	getTags: vi.fn(),
	createTag: vi.fn(),
	initializeUserTags: vi.fn(),
}));

const testInitialData = {
	id: "test-page-123",
	title: "テストページタイトル",
	tori: ["投げ"],
	uke: ["受け身"],
	waza: ["技名"],
	content: "テスト稽古内容",
	comment: "テストコメント",
};

describe("PageModal", () => {
	beforeEach(async () => {
		vi.clearAllMocks();

		// 動的にモックを取得してセットアップ
		const { getTags } = await import("@/lib/api/client");
		vi.mocked(getTags).mockResolvedValue({
			success: true,
			data: [],
		});
	});

	it("モーダルが閉じている時はダイアログが表示されない", () => {
		// Arrange: モーダルが閉じられている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnSubmit = vi.fn();
		const isOpen = false;

		// Act: モーダルをレンダリングする
		render(
			<PageModal
				isOpen={isOpen}
				onClose={mockOnClose}
				onSubmit={mockOnSubmit}
				modalTitle="テストモーダル"
				actionButtonText="実行"
			/>,
		);

		// Assert: モーダルが表示されない
		expect(screen.queryByText("テストモーダル")).not.toBeInTheDocument();
	});

	it("モーダルが開いている時はカスタムタイトルが表示される", () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnSubmit = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<PageModal
				isOpen={isOpen}
				onClose={mockOnClose}
				onSubmit={mockOnSubmit}
				modalTitle="カスタムモーダルタイトル"
				actionButtonText="実行"
			/>,
		);

		// Assert: カスタムタイトルが表示される
		expect(screen.getByText("カスタムモーダルタイトル")).toBeInTheDocument();
	});

	it("カスタムアクションボタンテキストが表示される", () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnSubmit = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<PageModal
				isOpen={isOpen}
				onClose={mockOnClose}
				onSubmit={mockOnSubmit}
				modalTitle="テストモーダル"
				actionButtonText="カスタム実行"
			/>,
		);

		// Assert: カスタムアクションボタンテキストが表示される
		expect(screen.getByText("カスタム実行")).toBeInTheDocument();
	});

	it("キャンセルボタンをクリックするとonCloseが呼ばれる", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const user = userEvent.setup();
		const mockOnClose = vi.fn();
		const mockOnSubmit = vi.fn();
		const isOpen = true;

		render(
			<PageModal
				isOpen={isOpen}
				onClose={mockOnClose}
				onSubmit={mockOnSubmit}
				modalTitle="テストモーダル"
				actionButtonText="実行"
			/>,
		);

		const cancelButton = screen.getByText("キャンセル");

		// Act: キャンセルボタンをクリックする
		await user.click(cancelButton);

		// Assert: onCloseが呼ばれる
		expect(mockOnClose).toHaveBeenCalledOnce();
	});
});