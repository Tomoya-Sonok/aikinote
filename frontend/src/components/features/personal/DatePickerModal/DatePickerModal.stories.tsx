import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DatePickerModal } from "./DatePickerModal";

const meta: Meta<typeof DatePickerModal> = {
  title: "Features/Personal/DatePickerModal",
  component: DatePickerModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpen: { control: "boolean" },
    onClose: { action: "close" },
    onDateSelect: { action: "dateSelect" },
    title: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Modal closed"),
    onDateSelect: (range) => console.log("Date selected:", range),
    title: "日付を選択",
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log("Modal closed"),
    onDateSelect: (date) => console.log("Date selected:", date),
    title: "日付を選択",
  },
};

export const WithSelectedDate: Story = {
  args: {
    isOpen: true,
    selectedRange: {
      startDate: new Date(2024, 8, 22),
      endDate: new Date(2024, 8, 24),
    },
    onClose: () => console.log("Modal closed"),
    onDateSelect: (range) => console.log("Date selected:", range),
    title: "日付を選択",
  },
};

export const WithCustomTitle: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Modal closed"),
    onDateSelect: (range) => console.log("Date selected:", range),
    title: "練習日を選択してください",
  },
};

export const WithTodaySelected: Story = {
  args: {
    isOpen: true,
    selectedRange: {
      startDate: new Date(),
      endDate: new Date(),
    },
    onClose: () => console.log("Modal closed"),
    onDateSelect: (range) => console.log("Date selected:", range),
    title: "日付を選択",
  },
};
