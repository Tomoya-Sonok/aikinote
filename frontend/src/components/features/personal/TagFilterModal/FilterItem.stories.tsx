import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TagFilterModal } from "./TagFilterModal";

const meta: Meta<typeof TagFilterModal> = {
  title: "Organisms/TagFilterModal",
  component: TagFilterModal,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TagFilter: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    tags: [
      { id: "1", name: "相半身", category: "取り" },
      { id: "2", name: "片手取り", category: "受け" },
      { id: "3", name: "四方投げ", category: "技" },
    ],
    selectedTags: [],
    onTagsConfirm: () => {},
    title: "タグを選択",
  },
};

export const DateFilter: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    tags: [
      { id: "1", name: "立技", category: "取り" },
      { id: "2", name: "正面打ち", category: "受け" },
    ],
    selectedTags: ["立技"],
    onTagsConfirm: () => {},
    title: "フィルター",
  },
};

export const WithoutClick: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    tags: [],
    selectedTags: [],
    onTagsConfirm: () => {},
  },
};
