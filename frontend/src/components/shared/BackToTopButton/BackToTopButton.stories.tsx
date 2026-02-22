import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BackToTopButton } from "./BackToTopButton";

const meta: Meta<typeof BackToTopButton> = {
  title: "Atoms/BackToTopButton",
  component: BackToTopButton,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  render: (args) => (
    <div
      style={{
        position: "relative",
        height: "180px",
        background: "#000000",
        color: "#ffffff",
      }}
    >
      <div style={{ padding: "24px" }}>フッターのサンプル領域</div>
      <BackToTopButton {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "トップに戻る",
  },
};
