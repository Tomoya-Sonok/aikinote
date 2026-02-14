import type { Meta, StoryObj } from "@storybook/nextjs";
import { FloatingActionButton } from "./FloatingActionButton";

const meta: Meta<typeof FloatingActionButton> = {
  title: "Atoms/FloatingActionButton",
  component: FloatingActionButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onClick: { action: "clicked" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClick: () => console.log("FAB clicked"),
  },
};

export const CustomLabel: Story = {
  args: {
    label: "カスタムラベル",
    onClick: () => console.log("FAB with custom label clicked"),
  },
};
