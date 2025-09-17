import type { Meta, StoryObj } from "@storybook/nextjs";
import { FilterItemModal } from "./FilterItemModal";

const meta: Meta<typeof FilterItemModal> = {
	title: "Atoms/FilterItemModal",
	component: FilterItemModal,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		onClick: { action: "clicked" },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TagFilter: Story = {
	args: {
		icon: "/icons/tag-icon.svg",
		label: "タグ",
		value: "指定なし",
		onClick: () => console.log("Tag filter clicked"),
	},
};

export const DateFilter: Story = {
	args: {
		icon: "/icons/calendar-icon.svg",
		label: "日付",
		value: "2024-01-15",
		onClick: () => console.log("Date filter clicked"),
	},
};

export const WithoutClick: Story = {
	args: {
		icon: "/icons/tag-icon.svg",
		label: "タグ",
		value: "選択済み",
	},
};
