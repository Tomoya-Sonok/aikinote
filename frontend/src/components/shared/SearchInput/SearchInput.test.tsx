import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./SearchInput";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      "components.searchPlaceholder": "キーワードで検索",
      "components.clear": "クリア",
    };
    return dict[key] ?? key;
  },
}));

describe("SearchInput", () => {
  it("input が type='search' で enterKeyHint='search' / inputMode='search' を持つ", () => {
    // Arrange / Act
    render(<SearchInput value="" onChange={() => {}} />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;

    // Assert
    expect(input.type).toBe("search");
    expect(input.getAttribute("enterKeyHint")).toBe("search");
    expect(input.getAttribute("inputMode")).toBe("search");
  });

  it("form の submit イベントで onSubmit が現在の value で呼ばれる", () => {
    // Arrange
    const handleSubmit = vi.fn();
    const { container } = render(
      <SearchInput
        value="合気道"
        onChange={() => {}}
        onSubmit={handleSubmit}
      />,
    );
    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    // Act
    if (form) fireEvent.submit(form);

    // Assert
    expect(handleSubmit).toHaveBeenCalledWith("合気道");
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("Enter キー押下（IME 確定外）で form submit が発火し onSubmit が呼ばれる", async () => {
    // Arrange
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <SearchInput
        value="検索クエリ"
        onChange={() => {}}
        onSubmit={handleSubmit}
      />,
    );
    const input = screen.getByRole("searchbox");

    // Act
    await user.click(input);
    await user.keyboard("{Enter}");

    // Assert
    expect(handleSubmit).toHaveBeenCalledWith("検索クエリ");
  });

  it("IME 変換確定中（keyCode 229）の Enter では onSubmit が呼ばれない", () => {
    // Arrange
    const handleSubmit = vi.fn();
    render(
      <SearchInput
        value="あいき"
        onChange={() => {}}
        onSubmit={handleSubmit}
      />,
    );
    const input = screen.getByRole("searchbox");

    // Act
    fireEvent.keyDown(input, {
      key: "Enter",
      keyCode: 229,
      isComposing: true,
    });

    // Assert
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("値があるとクリアボタンが表示され、押下で onClear が呼ばれる", async () => {
    // Arrange
    const handleClear = vi.fn();
    const user = userEvent.setup();
    render(
      <SearchInput value="text" onChange={() => {}} onClear={handleClear} />,
    );

    // Act
    await user.click(screen.getByRole("button", { name: "クリア" }));

    // Assert
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("値が空のときはクリアボタンが表示されない", () => {
    // Arrange / Act
    render(<SearchInput value="" onChange={() => {}} onClear={() => {}} />);

    // Assert
    expect(
      screen.queryByRole("button", { name: "クリア" }),
    ).not.toBeInTheDocument();
  });

  it("後方互換: onKeyDown プロップが渡されていれば従来通り keydown で呼ばれる", () => {
    // Arrange
    const handleKeyDown = vi.fn();
    render(
      <SearchInput value="" onChange={() => {}} onKeyDown={handleKeyDown} />,
    );
    const input = screen.getByRole("searchbox");

    // Act
    fireEvent.keyDown(input, { key: "a" });

    // Assert
    expect(handleKeyDown).toHaveBeenCalled();
  });

  it("IME 確定中の Enter では onKeyDown は早期リターンされ呼ばれない", () => {
    // Arrange
    const handleKeyDown = vi.fn();
    render(
      <SearchInput value="" onChange={() => {}} onKeyDown={handleKeyDown} />,
    );
    const input = screen.getByRole("searchbox");

    // Act
    fireEvent.keyDown(input, {
      key: "Enter",
      keyCode: 229,
      isComposing: true,
    });

    // Assert
    expect(handleKeyDown).not.toHaveBeenCalled();
  });
});
