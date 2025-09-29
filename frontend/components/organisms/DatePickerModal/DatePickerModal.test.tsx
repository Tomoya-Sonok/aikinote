import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nTestProvider } from "../../../test-utils/i18n-test-provider";
import { DatePickerModal } from "./DatePickerModal";
import styles from "./DatePickerModal.module.css";

describe("DatePickerModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("モーダルが閉じている時は日付選択ダイアログが表示されない", async () => {
		// Arrange: モーダルが閉じられている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = false;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: モーダルが表示されない
		expect(screen.queryByText("日付を選択")).not.toBeInTheDocument();
	});

	it("モーダルが開いている時は日付選択ダイアログが表示される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: 日付選択モーダルが表示される
		expect(screen.getByText("日付を選択")).toBeInTheDocument();
	});

	it("閉じるボタンが表示される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: 閉じるボタンが表示される
		expect(screen.getByLabelText("閉じる")).toBeInTheDocument();
	});

	it("キャンセルボタンが表示される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: キャンセルボタンが表示される
		expect(screen.getByText("キャンセル")).toBeInTheDocument();
	});

	it("絞り込みボタンが表示される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: 絞り込みボタンが表示される
		expect(screen.getByText("絞り込み")).toBeInTheDocument();
	});

	it("カレンダーが表示される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: 曜日ヘッダーが表示される
		expect(screen.getByText("日")).toBeInTheDocument();
		expect(screen.getByText("月")).toBeInTheDocument();
		expect(screen.getByText("火")).toBeInTheDocument();
		expect(screen.getByText("水")).toBeInTheDocument();
		expect(screen.getByText("木")).toBeInTheDocument();
		expect(screen.getByText("金")).toBeInTheDocument();
		expect(screen.getByText("土")).toBeInTheDocument();
	});

	it("月移動ボタンが表示される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: 前月ボタンが表示される
		expect(screen.getByLabelText("前の月")).toBeInTheDocument();

		// Assert: 次月ボタンが表示される
		expect(screen.getByLabelText("次の月")).toBeInTheDocument();
	});

	it("閉じるボタンをクリックするとonCloseが呼び出される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const user = userEvent.setup();
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングして閉じるボタンをクリックする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		const closeButton = screen.getByLabelText("閉じる");
		await user.click(closeButton);

		// Assert: onCloseが呼び出される
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("キャンセルボタンをクリックするとonCloseが呼び出される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const user = userEvent.setup();
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングしてキャンセルボタンをクリックする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		const cancelButton = screen.getByText("キャンセル");
		await user.click(cancelButton);

		// Assert: onCloseが呼び出される
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("絞り込みボタンをクリックするとonDateSelectとonCloseが呼び出される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const user = userEvent.setup();
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const isOpen = true;

		// Act: モーダルをレンダリングして絞り込みボタンをクリックする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		const confirmButton = screen.getByText("絞り込み");
		await user.click(confirmButton);

		// Assert: onDateSelectが呼び出される
		expect(mockOnDateSelect).toHaveBeenCalledTimes(1);

		// Assert: onCloseが呼び出される
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("選択済み日付がある場合は該当日付が選択状態で表示される", async () => {
		// Arrange: 2024年9月22日が選択された状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const selectedDate = new Date(2024, 8, 22); // 2024年9月22日
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					selectedDate={selectedDate}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: 選択された日付が選択状態で表示される
		const dateButton = screen.getByRole("button", { name: "22" });
		expect(dateButton).toHaveClass(styles.selected);
	});

	it("カスタムタイトルが正しく表示される", async () => {
		// Arrange: カスタムタイトルを設定してプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const customTitle = "練習日を選択してください";
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title={customTitle}
				/>
			</I18nTestProvider>,
		);

		// Assert: カスタムタイトルが表示される
		expect(screen.getByText(customTitle)).toBeInTheDocument();
	});

	it("今日の日付がtoday状態で表示される", async () => {
		// Arrange: モーダルが開いている状態でプロパティを準備する
		const mockOnClose = vi.fn();
		const mockOnDateSelect = vi.fn();
		const today = new Date();
		const todayDate = today.getDate();
		const isOpen = true;

		// Act: モーダルをレンダリングする
		render(
			<I18nTestProvider>
				<DatePickerModal
					isOpen={isOpen}
					onClose={mockOnClose}
					onDateSelect={mockOnDateSelect}
					title="日付を選択"
				/>
			</I18nTestProvider>,
		);

		// Assert: 今日の日付がtoday状態で表示される
		const todayButton = screen.getByRole("button", {
			name: todayDate.toString(),
		});
		expect(todayButton).toHaveClass(styles.today);
	});
});