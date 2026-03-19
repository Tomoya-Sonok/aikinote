import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { TagSelection } from "./TagSelection";

const meta: Meta<typeof TagSelection> = {
  title: "Molecules/TagSelection",
  component: TagSelection,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onTagToggle: { action: "tag-toggled" },
    onAddNew: { action: "add-new" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const TagSelectionWithState = ({
  title,
  tags,
  initialSelectedTags = [],
  onAddNew,
}: {
  title: string;
  tags: string[];
  initialSelectedTags?: string[];
  onAddNew?: () => void;
}) => {
  const [selectedTags, setSelectedTags] =
    useState<string[]>(initialSelectedTags);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <TagSelection
      title={title}
      tags={tags}
      selectedTags={selectedTags}
      onTagToggle={handleTagToggle}
      onAddNew={onAddNew}
    />
  );
};

export const Tori: Story = {
  render: () => (
    <TagSelectionWithState
      title="取り"
      tags={["立技", "坐技", "半身半立"]}
      onAddNew={() => console.log("Add new tori tag")}
    />
  ),
};

export const Uke: Story = {
  render: () => (
    <TagSelectionWithState
      title="受け"
      tags={[
        "相半身",
        "逆半身",
        "片手取り",
        "諸手取り",
        "両手取り",
        "後ろ",
        "肩取り",
        "正面打ち",
        "横面打ち",
        "突き",
      ]}
      onAddNew={() => console.log("Add new uke tag")}
    />
  ),
};

export const Waza: Story = {
  render: () => (
    <TagSelectionWithState
      title="技"
      tags={[
        "一教",
        "二教",
        "三教",
        "四教",
        "五教",
        "入身投げ",
        "四方投げ",
        "小手返し",
        "回転投げ",
      ]}
      initialSelectedTags={["一教", "正面打ち"]}
      onAddNew={() => console.log("Add new waza tag")}
    />
  ),
};
