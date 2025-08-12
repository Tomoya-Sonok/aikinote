import type { Meta, StoryObj } from "@storybook/nextjs";
import { SearchInput } from "./SearchInput";

const meta: Meta<typeof SearchInput> = {
  title: "Atoms/SearchInput",
  component: SearchInput,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "",
    onChange: (e) => console.log("Search changed:", e.target.value),
  },
};

export const WithValue: Story = {
  args: {
    value: "サンプル検索",
    onChange: (e) => console.log("Search changed:", e.target.value),
  },
};

export const CustomPlaceholder: Story = {
  args: {
    value: "",
    placeholder: "カスタムプレースホルダー",
    onChange: (e) => console.log("Search changed:", e.target.value),
  },
};
