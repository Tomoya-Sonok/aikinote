import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SocialReplyItem } from "./SocialReplyItem";

const mockUser = {
  id: "user-2",
  username: "hanako_budo",
  profile_image_url: null,
};

const baseMockReply = {
  id: "reply-1",
  user_id: "user-2",
  content: "素晴らしい稽古記録ですね！私も同じ技を練習中です。",
  favorite_count: 5,
  created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  user: mockUser,
  is_favorited: false,
};

const noopAsync = async () => {};

const meta: Meta<typeof SocialReplyItem> = {
  title: "Features/Social/SocialReplyItem",
  component: SocialReplyItem,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    onReport: { action: "report" },
    onFavoriteToggle: { action: "favoriteToggle" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    reply: baseMockReply,
    currentUserId: "user-1",
    onReport: () => {},
    onEdit: noopAsync,
    onDelete: noopAsync,
    onFavoriteToggle: () => {},
  },
};

export const OwnReply: Story = {
  args: {
    reply: {
      ...baseMockReply,
      user_id: "user-1",
      user: {
        id: "user-1",
        username: "taro_aikido",
        profile_image_url: null,
      },
    },
    currentUserId: "user-1",
    onReport: () => {},
    onEdit: noopAsync,
    onDelete: noopAsync,
    onFavoriteToggle: () => {},
  },
};

export const Edited: Story = {
  args: {
    reply: {
      ...baseMockReply,
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    currentUserId: "user-1",
    onReport: () => {},
    onEdit: noopAsync,
    onDelete: noopAsync,
    onFavoriteToggle: () => {},
  },
};

export const Favorited: Story = {
  args: {
    reply: {
      ...baseMockReply,
      is_favorited: true,
      favorite_count: 12,
      user_id: "user-1",
      user: {
        id: "user-1",
        username: "taro_aikido",
        profile_image_url: null,
      },
    },
    currentUserId: "user-1",
    onReport: () => {},
    onEdit: noopAsync,
    onDelete: noopAsync,
    onFavoriteToggle: () => {},
  },
};
