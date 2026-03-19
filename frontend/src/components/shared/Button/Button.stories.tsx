import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Shared/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "icon"],
    },
    size: {
      control: "select",
      options: ["small", "medium", "large"],
    },
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "ボタン",
    variant: "primary",
    size: "medium",
    disabled: false,
  },
};

export const Secondary: Story = {
  args: {
    children: "ボタン",
    variant: "secondary",
    size: "medium",
    disabled: false,
  },
};

export const Icon: Story = {
  args: {
    children: "🔍",
    variant: "icon",
    size: "medium",
    disabled: false,
  },
};

export const Small: Story = {
  args: {
    children: "小さいボタン",
    variant: "primary",
    size: "small",
    disabled: false,
  },
};

export const Large: Story = {
  args: {
    children: "大きいボタン",
    variant: "primary",
    size: "large",
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    children: "無効ボタン",
    variant: "primary",
    size: "medium",
    disabled: true,
  },
};
