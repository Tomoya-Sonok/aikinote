import type { Meta, StoryObj } from "@storybook/nextjs";
import { TagFilterModal } from "./TagFilterModal";

const meta: Meta<typeof TagFilterModal> = {
  title: "Organisms/TagFilterModal",
  component: TagFilterModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpen: { control: "boolean" },
    onClose: { action: "close" },
    onTagsConfirm: { action: "tagsConfirm" },
    title: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockTags = [
  { id: "1", name: "基本練習", category: "取り" },
  { id: "2", name: "応用練習", category: "取り" },
  { id: "3", name: "実戦練習", category: "取り" },
  { id: "4", name: "前受け身", category: "受け" },
  { id: "5", name: "後ろ受け身", category: "受け" },
  { id: "6", name: "横受け身", category: "受け" },
  { id: "7", name: "四方投げ", category: "技" },
  { id: "8", name: "小手返し", category: "技" },
  { id: "9", name: "入り身投げ", category: "技" },
  { id: "10", name: "天地投げ", category: "技" },
];

export const Default: Story = {
  args: {
    isOpen: true,
    tags: mockTags,
    selectedTags: [],
    onClose: () => console.log("Modal closed"),
    onTagsConfirm: (tags) => console.log("Tags confirmed:", tags),
    title: "タグで絞り込み",
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    tags: mockTags,
    selectedTags: [],
    onClose: () => console.log("Modal closed"),
    onTagsConfirm: (tags) => console.log("Tags confirmed:", tags),
    title: "タグで絞り込み",
  },
};

export const WithSelectedTags: Story = {
  args: {
    isOpen: true,
    tags: mockTags,
    selectedTags: ["基本練習", "前受け身", "四方投げ"],
    onClose: () => console.log("Modal closed"),
    onTagsConfirm: (tags) => console.log("Tags confirmed:", tags),
    title: "タグで絞り込み",
  },
};

export const WithCustomTitle: Story = {
  args: {
    isOpen: true,
    tags: mockTags,
    selectedTags: [],
    onClose: () => console.log("Modal closed"),
    onTagsConfirm: (tags) => console.log("Tags confirmed:", tags),
    title: "練習内容で絞り込み",
  },
};

export const WithEmptyTags: Story = {
  args: {
    isOpen: true,
    tags: [],
    selectedTags: [],
    onClose: () => console.log("Modal closed"),
    onTagsConfirm: (tags) => console.log("Tags confirmed:", tags),
    title: "タグで絞り込み",
  },
};

export const WithManySelectedTags: Story = {
  args: {
    isOpen: true,
    tags: mockTags,
    selectedTags: ["基本練習", "応用練習", "前受け身", "後ろ受け身", "四方投げ", "小手返し"],
    onClose: () => console.log("Modal closed"),
    onTagsConfirm: (tags) => console.log("Tags confirmed:", tags),
    title: "タグで絞り込み",
  },
};