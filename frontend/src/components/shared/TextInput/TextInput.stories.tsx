import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextInput } from "./TextInput";

const meta: Meta<typeof TextInput> = {
  title: "Atoms/TextInput",
  component: TextInput,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" },
    onFocus: { action: "focused" },
    onBlur: { action: "blurred" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "ラベル",
    placeholder: "入力してください",
  },
};

export const Required: Story = {
  args: {
    label: "必須項目",
    required: true,
    placeholder: "必須入力項目です",
  },
};

export const WithError: Story = {
  args: {
    label: "エラーのある入力",
    required: true,
    value: "",
    error: "この項目は必須です",
  },
};

export const WithValue: Story = {
  args: {
    label: "値が入っている状態",
    value: "入力された値",
  },
};
