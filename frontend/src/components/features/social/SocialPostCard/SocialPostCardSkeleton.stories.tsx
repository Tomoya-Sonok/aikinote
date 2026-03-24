import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SocialPostCardSkeleton } from "./SocialPostCardSkeleton";

const meta: Meta<typeof SocialPostCardSkeleton> = {
  title: "Features/Social/SocialPostCardSkeleton",
  component: SocialPostCardSkeleton,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
