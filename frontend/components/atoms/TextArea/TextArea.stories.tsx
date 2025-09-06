import type { Meta, StoryObj } from "@storybook/nextjs";
import { TextArea } from "./TextArea";

const meta: Meta<typeof TextArea> = {
  title: "Atoms/TextArea",
  component: TextArea,
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
    label: "テキストエリア",
    placeholder: "複数行のテキストを入力してください",
    rows: 3,
  },
};

export const Required: Story = {
  args: {
    label: "稽古内容",
    required: true,
    placeholder: "稽古の内容を詳しく記述してください",
    rows: 5,
  },
};

export const WithError: Story = {
  args: {
    label: "エラーのあるテキストエリア",
    required: true,
    value: "",
    error: "この項目は必須です",
    rows: 3,
  },
};

export const LargeText: Story = {
  args: {
    label: "長いテキストの例",
    value: "これは長いテキストの例です。\n複数行にわたって入力されたテキストがどのように表示されるかを確認できます。\n\n段落分けもできます。",
    rows: 8,
  },
};
