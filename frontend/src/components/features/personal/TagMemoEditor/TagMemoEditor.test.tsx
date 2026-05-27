import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type MemoDraft,
  type MemoTagRef,
  TagMemoEditor,
} from "./TagMemoEditor";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const tag = (name: string): MemoTagRef => ({ name, category: "取り" });
const memo = (id: string, tags: MemoTagRef[], content: string): MemoDraft => ({
  id,
  tags,
  content,
});

describe("TagMemoEditor", () => {
  it("候補タグが0件のときは「タグを選択」メッセージを出し、メモ追加ボタンを非活性にする", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(<TagMemoEditor availableTags={[]} memos={[]} onChange={onChange} />);

    // Assert
    expect(screen.getByText("pageCreate.selectTagFirst")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "pageCreate.addMemo" }),
    ).toBeDisabled();
  });

  it("メモ追加ボタンで空のメモが1件追加される", () => {
    // Arrange
    const onChange = vi.fn();
    const memos = [memo("1", [], "")];

    // Act
    render(
      <TagMemoEditor
        availableTags={[tag("立技")]}
        memos={memos}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "pageCreate.addMemo" }));

    // Assert
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as MemoDraft[];
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ tags: [], content: "" });
  });

  it("既に3個タグを選んだメモでは4個目のタグ選択を無視する（上限3）", () => {
    // Arrange
    const onChange = vi.fn();
    const memos = [memo("1", [tag("技1"), tag("技2"), tag("技3")], "")];

    // Act
    render(
      <TagMemoEditor
        availableTags={[tag("技1"), tag("技2"), tag("技3"), tag("技4")]}
        memos={memos}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "技4" }));

    // Assert
    expect(onChange).not.toHaveBeenCalled();
  });

  it("選択済みタグを再度押すとそのタグが外れる", () => {
    // Arrange
    const onChange = vi.fn();
    const memos = [memo("1", [tag("技1"), tag("技2")], "")];

    // Act
    render(
      <TagMemoEditor
        availableTags={[tag("技1"), tag("技2")]}
        memos={memos}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "技1" }));

    // Assert
    const next = onChange.mock.calls[0][0] as MemoDraft[];
    expect(next[0].tags).toEqual([tag("技2")]);
  });
});
