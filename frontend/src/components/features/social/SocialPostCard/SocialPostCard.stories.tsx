import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { SocialFeedPostData } from "./SocialPostCard";
import { SocialPostCard } from "./SocialPostCard";

const mockAuthor = {
  id: "user-1",
  username: "taro_aikido",
  profile_image_url: null,
  aikido_rank: "3段",
};

const baseMockPost: SocialFeedPostData = {
  id: "post-1",
  user_id: "user-1",
  content:
    "今日の稽古では四方投げを重点的に練習しました。先生から体捌きのコツを教わり、少しずつ感覚が掴めてきた気がします。",
  post_type: "regular_post",
  author_dojo_name: "合気会",
  favorite_count: 12,
  reply_count: 3,
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  author: mockAuthor,
  attachments: [],
  tags: [],
  hashtags: [],
  is_favorited: false,
  source_page_id: null,
  source_page_title: null,
  source_page_tags: [],
};

const meta: Meta<typeof SocialPostCard> = {
  title: "Features/Social/SocialPostCard",
  component: SocialPostCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    onFavoriteToggle: { action: "favoriteToggle" },
    onClick: { action: "click" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const RegularPost: Story = {
  args: {
    post: baseMockPost,
    currentUserId: "user-1",
    onFavoriteToggle: () => {},
    onClick: () => {},
  },
};

export const TrainingRecord: Story = {
  args: {
    post: {
      ...baseMockPost,
      id: "post-2",
      post_type: "training_record",
      content: "受け身の基本を復習。前回身と後ろ受け身を中心に。",
      source_page_id: "page-1",
      source_page_title: "2025年3月15日 土曜稽古",
      source_page_tags: [
        { name: "前受け身", category: "技" },
        { name: "後ろ受け身", category: "技" },
      ],
    },
    currentUserId: "user-2",
    onFavoriteToggle: () => {},
    onClick: () => {},
  },
};

export const Favorited: Story = {
  args: {
    post: {
      ...baseMockPost,
      id: "post-3",
      is_favorited: true,
      favorite_count: 25,
    },
    currentUserId: "user-1",
    onFavoriteToggle: () => {},
    onClick: () => {},
  },
};

export const WithTags: Story = {
  args: {
    post: {
      ...baseMockPost,
      id: "post-4",
      tags: [
        { id: "tag-1", name: "四方投げ", category: "技" },
        { id: "tag-2", name: "入り身投げ", category: "技" },
        { id: "tag-3", name: "基本稽古", category: "取り" },
      ],
    },
    currentUserId: "user-2",
    onFavoriteToggle: () => {},
    onClick: () => {},
  },
};

export const WithHashtags: Story = {
  args: {
    post: {
      ...baseMockPost,
      id: "post-5",
      content:
        "今日は #合気道 の稽古で #四方投げ を集中的に練習。#初心者 にも分かりやすい指導でした。",
      hashtags: [
        { id: "h-1", name: "合気道" },
        { id: "h-2", name: "四方投げ" },
        { id: "h-3", name: "初心者" },
      ],
    },
    currentUserId: "user-2",
    onFavoriteToggle: () => {},
    onClick: () => {},
  },
};

export const WithUnreadReplies: Story = {
  args: {
    post: {
      ...baseMockPost,
      id: "post-6",
      reply_count: 5,
    },
    currentUserId: "user-1",
    hasUnreadReplies: true,
    onFavoriteToggle: () => {},
    onClick: () => {},
  },
};

export const OtherUserPost: Story = {
  args: {
    post: {
      ...baseMockPost,
      id: "post-7",
      user_id: "user-other",
      author: {
        id: "user-other",
        username: "hanako_budo",
        profile_image_url: null,
        aikido_rank: "初段",
      },
      author_dojo_name: "養神館",
      favorite_count: 8,
    },
    currentUserId: "user-1",
    onFavoriteToggle: () => {},
    onClick: () => {},
  },
};
