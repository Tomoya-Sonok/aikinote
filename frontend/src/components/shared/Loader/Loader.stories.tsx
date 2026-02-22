import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Loader } from "./Loader";

const meta: Meta<typeof Loader> = {
  title: "Atoms/Loader",
  component: Loader,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#333333" },
      ],
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["small", "medium", "large"],
      description: "ローダーのサイズ",
    },
    centered: {
      control: "boolean",
      description: "中央揃えにするかどうか",
    },
    text: {
      control: "text",
      description: "表示するテキスト",
    },
    className: {
      control: "text",
      description: "カスタムクラス名",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なローダー
export const Default: Story = {
  args: {},
};

// サイズ別のローダー
export const Small: Story = {
  args: {
    size: "small",
  },
};

export const Medium: Story = {
  args: {
    size: "medium",
  },
};

export const Large: Story = {
  args: {
    size: "large",
  },
};

// テキスト付きローダー
export const WithText: Story = {
  args: {
    text: "読み込み中...",
  },
};

export const WithTextSmall: Story = {
  args: {
    size: "small",
    text: "処理中...",
  },
};

export const WithTextLarge: Story = {
  args: {
    size: "large",
    text: "データを取得しています...",
  },
};

// 中央揃えローダー
export const Centered: Story = {
  args: {
    centered: true,
  },
  parameters: {
    layout: "fullscreen",
  },
};

export const CenteredWithText: Story = {
  args: {
    size: "large",
    centered: true,
    text: "ページを読み込んでいます...",
  },
  parameters: {
    layout: "fullscreen",
  },
};

// 実際の使用例
export const LoginButton: Story = {
  args: {
    size: "small",
    text: "ログイン中...",
  },
  name: "ボタン内で使用（ログイン中）",
};

export const SignupButton: Story = {
  args: {
    size: "small",
    text: "作成中...",
  },
  name: "ボタン内で使用（作成中）",
};

export const PageLoading: Story = {
  args: {
    size: "large",
    centered: true,
    text: "読み込み中...",
  },
  parameters: {
    layout: "fullscreen",
  },
  name: "ページ読み込み",
};

// ダークモード対応の確認用
export const DarkMode: Story = {
  args: {
    size: "large",
    centered: true,
    text: "読み込み中...",
  },
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  name: "ダークモード",
};

// すべてのサイズの比較用
export const SizeComparison: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
      <div style={{ textAlign: "center" }}>
        <Loader size="small" />
        <p>Small</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <Loader size="medium" />
        <p>Medium</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <Loader size="large" />
        <p>Large</p>
      </div>
    </div>
  ),
  name: "サイズ比較",
};

// テキスト付きの比較用
export const TextComparison: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Loader size="small" text="処理中..." />
      <Loader size="medium" text="読み込み中..." />
      <Loader size="large" text="データを取得しています..." />
    </div>
  ),
  name: "テキスト付き比較",
};
