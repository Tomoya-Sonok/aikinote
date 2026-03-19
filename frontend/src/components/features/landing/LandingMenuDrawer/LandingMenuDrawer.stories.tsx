import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LandingMenuDrawer } from "./LandingMenuDrawer";

const meta: Meta<typeof LandingMenuDrawer> = {
  title: "Molecules/LandingMenuDrawer",
  component: LandingMenuDrawer,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  render: (args) => (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "16px",
        background: "#ffffff",
        minHeight: "200px",
      }}
    >
      <LandingMenuDrawer {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    menuLabel: "メニュー",
    closeLabel: "メニューを閉じる",
    ariaLabel: "ランディングページ内リンク",
    termsLabel: "利用規約",
    privacyLabel: "プライバシーポリシー",
    helpPrefix: "ヘルプ・問い合わせフォームは",
    helpLinkLabel: "こちら",
    links: [
      { href: "#hero", label: "トップ" },
      { href: "#pain-points", label: "稽古記録の悩み" },
      { href: "#solution-recording", label: "利用方法・流れ" },
      { href: "#solution-search", label: "便利な検索機能" },
      { href: "#faq", label: "FAQ・問い合わせ" },
    ],
  },
};
