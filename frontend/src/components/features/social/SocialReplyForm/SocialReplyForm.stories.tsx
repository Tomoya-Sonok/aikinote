import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SocialReplyForm } from "./SocialReplyForm";

const meta: Meta<typeof SocialReplyForm> = {
  title: "Features/Social/SocialReplyForm",
  component: SocialReplyForm,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSubmit: async (content: string) => {
      await new Promise((r) => setTimeout(r, 500));
      console.log("Submitted:", content);
    },
  },
};
