import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SocialTabBar } from "./SocialTabBar";

const meta: Meta<typeof SocialTabBar> = {
  title: "Features/Social/SocialTabBar",
  component: SocialTabBar,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    activeTab: {
      control: "select",
      options: ["all", "training", "favorites"],
    },
    onTabChange: { action: "tabChange" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllActive: Story = {
  args: {
    activeTab: "all",
    onTabChange: () => {},
  },
};

export const TrainingActive: Story = {
  args: {
    activeTab: "training",
    onTabChange: () => {},
  },
};

export const FavoritesActive: Story = {
  args: {
    activeTab: "favorites",
    onTabChange: () => {},
  },
};
