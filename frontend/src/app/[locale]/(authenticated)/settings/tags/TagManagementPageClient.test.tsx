import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { TagManagementPageClient } from "./TagManagementPageClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

const mockGetTags = vi.fn();
const mockCreateTag = vi.fn();
const mockDeleteTag = vi.fn();
const mockUpdateTagOrder = vi.fn();

vi.mock("@/lib/api/client", () => ({
  getTags: (...args: unknown[]) => mockGetTags(...args),
  createTag: (...args: unknown[]) => mockCreateTag(...args),
  deleteTag: (...args: unknown[]) => mockDeleteTag(...args),
  updateTagOrder: (...args: unknown[]) => mockUpdateTagOrder(...args),
}));

const mockUseAuth = vi.fn();
vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockShowToast = vi.fn();
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

const defaultTags = [
  {
    id: "tag-tori-1",
    name: "立技",
    category: "取り",
    user_id: "user-id",
    created_at: "2024-01-01T00:00:00.000Z",
    sort_order: 1,
  },
  {
    id: "tag-tori-2",
    name: "座技",
    category: "取り",
    user_id: "user-id",
    created_at: "2024-01-04T00:00:00.000Z",
    sort_order: 2,
  },
  {
    id: "tag-uke-1",
    name: "正面打ち",
    category: "受け",
    user_id: "user-id",
    created_at: "2024-01-02T00:00:00.000Z",
    sort_order: 3,
  },
  {
    id: "tag-waza-1",
    name: "四方投げ",
    category: "技",
    user_id: "user-id",
    created_at: "2024-01-03T00:00:00.000Z",
    sort_order: 4,
  },
];

describe("TagManagementPageClient", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockGetTags.mockReset();
    mockCreateTag.mockReset();
    mockDeleteTag.mockReset();
    mockUpdateTagOrder.mockReset();
    mockUseAuth.mockReturnValue({ user: { id: "user-id" } });
    mockGetTags.mockResolvedValue({ success: true, data: defaultTags });
    mockCreateTag.mockResolvedValue({ success: true });
    mockDeleteTag.mockResolvedValue({ success: true, data: defaultTags[0] });
    mockUpdateTagOrder.mockResolvedValue({ success: true, data: defaultTags });
    mockShowToast.mockReset();
  });

  it("タグ取得が成功したときにカテゴリごとのタグが表示される", async () => {
    render(
      <I18nTestProvider>
        <TagManagementPageClient locale="ja" />
      </I18nTestProvider>,
    );

    await waitFor(() => {
      expect(mockGetTags).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("立技")).toBeInTheDocument();
    expect(screen.getByText("座技")).toBeInTheDocument();
    expect(screen.getByText("正面打ち")).toBeInTheDocument();
    expect(screen.getByText("四方投げ")).toBeInTheDocument();
  });

  it("編集ボタンを押すと編集モードが表示される", async () => {
    render(
      <I18nTestProvider>
        <TagManagementPageClient locale="ja" />
      </I18nTestProvider>,
    );

    await waitFor(() => {
      expect(mockGetTags).toHaveBeenCalledTimes(1);
    });

    const toriSection = (
      await screen.findByRole("heading", { name: "取り" })
    ).closest("section");

    expect(toriSection).not.toBeNull();

    const editButton = within(toriSection as HTMLElement).getByRole("button", {
      name: "取りのタグを編集",
    });

    fireEvent.click(editButton);

    expect(within(toriSection as HTMLElement).getAllByText("×")).toHaveLength(
      2,
    );
    expect(
      screen.getByText(
        "タグを動かして並び替えることができます。×を押すとタグを削除できます。",
      ),
    ).toBeInTheDocument();
    expect(
      within(toriSection as HTMLElement).getByRole("button", {
        name: "並び順を保存",
      }),
    ).toBeInTheDocument();
  });

  it("タグ削除が成功すると一覧から該当タグが消える", async () => {
    render(
      <I18nTestProvider>
        <TagManagementPageClient locale="ja" />
      </I18nTestProvider>,
    );

    await waitFor(() => {
      expect(mockGetTags).toHaveBeenCalledTimes(1);
    });

    const toriSection = (
      await screen.findByRole("heading", { name: "取り" })
    ).closest("section");

    expect(toriSection).not.toBeNull();

    const editButton = within(toriSection as HTMLElement).getByRole("button", {
      name: "取りのタグを編集",
    });
    fireEvent.click(editButton);

    const targetTagButton = within(toriSection as HTMLElement).getByRole(
      "button",
      {
        name: /立技/,
      },
    );

    fireEvent.click(targetTagButton);

    await waitFor(() => {
      expect(mockDeleteTag).toHaveBeenCalledWith("tag-tori-1", "user-id");
    });

    await waitFor(() => {
      expect(screen.queryByText("立技")).not.toBeInTheDocument();
    });

    expect(mockShowToast).toHaveBeenCalledWith("タグを削除しました", "success");
  });

  it("並び順保存ボタンを押すとAPIが呼ばれる", async () => {
    mockUpdateTagOrder.mockResolvedValue({ success: true, data: defaultTags });

    render(
      <I18nTestProvider>
        <TagManagementPageClient locale="ja" />
      </I18nTestProvider>,
    );

    await waitFor(() => {
      expect(mockGetTags).toHaveBeenCalledTimes(1);
    });

    const toriSection = (
      await screen.findByRole("heading", { name: "取り" })
    ).closest("section");

    expect(toriSection).not.toBeNull();

    const editButton = within(toriSection as HTMLElement).getByRole("button", {
      name: "取りのタグを編集",
    });
    fireEvent.click(editButton);

    const listItems = within(toriSection as HTMLElement).getAllByRole(
      "listitem",
    );
    const list = within(toriSection as HTMLElement).getByRole("list");

    const firstTagWrapper = listItems[0];

    if (firstTagWrapper && list) {
      const dataTransfer = {
        effectAllowed: "",
        dropEffect: "",
        setData: vi.fn(),
        getData: vi.fn(),
      } as unknown as DataTransfer;

      fireEvent.dragStart(firstTagWrapper, { dataTransfer });
      fireEvent.dragOver(list, { dataTransfer });
      fireEvent.drop(list, { dataTransfer });
      fireEvent.dragEnd(firstTagWrapper, { dataTransfer });
    }

    const saveButton = within(toriSection as HTMLElement).getByRole("button", {
      name: "並び順を保存",
    });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateTagOrder).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateTagOrder).toHaveBeenCalledWith({
      user_id: "user-id",
      tori: ["tag-tori-2", "tag-tori-1"],
      uke: ["tag-uke-1"],
      waza: ["tag-waza-1"],
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      "タグの並び順を保存しました",
      "success",
    );
  });

  it("SPドラッグ操作でタグの並び順が入れ替わる", async () => {
    render(
      <I18nTestProvider>
        <TagManagementPageClient locale="ja" />
      </I18nTestProvider>,
    );

    await waitFor(() => {
      expect(mockGetTags).toHaveBeenCalledTimes(1);
    });

    const toriSection = (
      await screen.findByRole("heading", { name: "取り" })
    ).closest("section");

    expect(toriSection).not.toBeNull();

    const editButton = within(toriSection as HTMLElement).getByRole("button", {
      name: "取りのタグを編集",
    });
    fireEvent.click(editButton);

    const tagList = within(toriSection as HTMLElement).getByRole("list");
    const listItemsBefore = within(tagList).getAllByRole("listitem");
    const firstItem = listItemsBefore[0];
    const secondItem = listItemsBefore[1];

    const elementFromPointSpy = vi
      .spyOn(document, "elementFromPoint")
      .mockImplementation(() => secondItem);

    fireEvent.touchStart(firstItem, {
      touches: [
        {
          identifier: 1,
          clientX: 10,
          clientY: 10,
        },
      ],
    });

    fireEvent.touchMove(tagList, {
      touches: [
        {
          identifier: 1,
          clientX: 12,
          clientY: 40,
        },
      ],
    });

    fireEvent.touchEnd(tagList, {
      changedTouches: [
        {
          identifier: 1,
          clientX: 12,
          clientY: 40,
        },
      ],
    });

    elementFromPointSpy.mockRestore();

    await waitFor(() => {
      const listItemsAfter = within(tagList).getAllByRole("listitem");
      expect(listItemsAfter[0]).toHaveTextContent("座技");
      expect(listItemsAfter[1]).toHaveTextContent("立技");
    });
  });
});
