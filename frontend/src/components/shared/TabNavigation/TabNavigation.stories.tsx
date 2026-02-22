import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabNavigation } from "./TabNavigation";

const meta: Meta<typeof TabNavigation> = {
  title: "Molecules/TabNavigation",
  component: TabNavigation,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/personal/pages",
        push: () => {},
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const PersonalActive: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/personal/pages",
        push: () => {},
      },
    },
  },
};

export const SocialActive: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/social/posts",
        push: () => {},
      },
    },
  },
};

export const MypageActive: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/mypage",
        push: () => {},
      },
    },
  },
};
