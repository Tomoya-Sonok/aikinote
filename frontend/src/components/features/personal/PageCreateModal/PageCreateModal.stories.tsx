import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageCreateModal } from "./PageCreateModal";

const meta: Meta<typeof PageCreateModal> = {
  title: "Organisms/PageCreateModal",
  component: PageCreateModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpen: { control: "boolean" },
    onClose: { action: "close" },
    onSave: { action: "save" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Modal closed"),
    onSave: (data) => console.log("Page data saved:", data),
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log("Modal closed"),
    onSave: (data) => console.log("Page data saved:", data),
  },
};
