import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SelectInput } from "./SelectInput";

const meta: Meta<typeof SelectInput> = {
  title: "Shared/SelectInput",
  component: SelectInput,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "段級位",
    children: (
      <>
        <option value="">選択してください</option>
        <option value="初段">初段</option>
        <option value="二段">二段</option>
        <option value="三段">三段</option>
      </>
    ),
  },
};

export const Required: Story = {
  args: {
    label: "流派",
    required: true,
    children: (
      <>
        <option value="">選択してください</option>
        <option value="合気会">合気会</option>
        <option value="養神館">養神館</option>
      </>
    ),
  },
};

export const WithError: Story = {
  args: {
    label: "段級位",
    required: true,
    error: "この項目は必須です",
    children: (
      <>
        <option value="">選択してください</option>
        <option value="初段">初段</option>
      </>
    ),
  },
};

export const WithValue: Story = {
  args: {
    label: "段級位",
    value: "二段",
    children: (
      <>
        <option value="">選択してください</option>
        <option value="初段">初段</option>
        <option value="二段">二段</option>
        <option value="三段">三段</option>
      </>
    ),
  },
};

export const WithoutLabel: Story = {
  args: {
    children: (
      <>
        <option value="">選択してください</option>
        <option value="初段">初段</option>
        <option value="二段">二段</option>
        <option value="三段">三段</option>
      </>
    ),
  },
};
