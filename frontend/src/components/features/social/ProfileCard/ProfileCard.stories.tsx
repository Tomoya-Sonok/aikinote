import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProfileCard } from "./ProfileCard";

const meta: Meta<typeof ProfileCard> = {
  title: "Features/Social/ProfileCard",
  component: ProfileCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    aikidoRank: {
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    profileImageUrl: null,
    fullName: "山田太郎",
    username: "taro_aikido",
    dojoStyleName: "合気会",
    aikidoRank: "3段",
    bio: "合気道歴10年。毎週末稽古しています。\nよろしくお願いします。",
  },
};

export const UsernameOnly: Story = {
  args: {
    profileImageUrl: null,
    fullName: null,
    username: "hanako_budo",
    dojoStyleName: null,
    aikidoRank: null,
    bio: null,
  },
};

export const WithoutBio: Story = {
  args: {
    profileImageUrl: null,
    fullName: "佐藤花子",
    username: "hanako_sato",
    dojoStyleName: "養神館",
    aikidoRank: "初段",
    bio: null,
  },
};

export const LongBio: Story = {
  args: {
    profileImageUrl: null,
    fullName: "鈴木一郎",
    username: "ichiro_suzuki",
    dojoStyleName: "合気会",
    aikidoRank: "5級",
    bio: "合気道を始めたばかりの初心者です。\n毎回の稽古で新しい発見があり、楽しく学んでいます。\n先輩方の技を見て日々精進中。\n目標は来年の審査で4級を取ることです。",
  },
};
