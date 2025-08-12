import type { Meta, StoryObj } from "@storybook/nextjs";
import { AppLayout } from "./AppLayout";

const meta: Meta<typeof AppLayout> = {
  title: "Layout/AppLayout",
  component: AppLayout,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div
        style={{ padding: "20px", background: "#f0f0f0", minHeight: "400px" }}
      >
        <h1>サンプルコンテンツ</h1>
        <p>AppLayoutでラップされたコンテンツのサンプルです。</p>
        <p>
          ヘッダーにはAikiNoteのロゴが表示され、コンテンツは最大幅327pxでセンタリングされます。
        </p>
      </div>
    ),
  },
};
