import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReportModal } from "./ReportModal";

const meta: Meta<typeof ReportModal> = {
  title: "Features/Social/ReportModal",
  component: ReportModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    onClose: { action: "close" },
    onSubmit: { action: "submit" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSubmit: () => {},
    title: "投稿を通報する",
  },
};

export const ReplyReport: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSubmit: () => {},
    title: "コメントを通報する",
  },
};
