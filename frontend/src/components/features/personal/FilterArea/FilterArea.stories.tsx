import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterArea } from "./FilterArea";

const meta: Meta<typeof FilterArea> = {
  title: "Molecules/FilterArea",
  component: FilterArea,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    onSearchChange: { action: "search changed" },
    onDateFilterChange: { action: "date filter changed" },
    onTagFilterChange: { action: "tag filter changed" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSearchChange: (search: string) => console.log("Search changed:", search),
    onDateFilterChange: (date: string | null) =>
      console.log("Date filter changed:", date),
    onTagFilterChange: (tags: string[]) =>
      console.log("Tag filter changed:", tags),
  },
};
