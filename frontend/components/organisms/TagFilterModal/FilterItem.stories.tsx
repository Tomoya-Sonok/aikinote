import type { Meta, StoryObj } from "@storybook/nextjs";
import { TagFilterModal } from "./TagFilterModal";

const meta: Meta<typeof TagFilterModal> = {
	title: "Atoms/TagFilterModal",
	component: TagFilterModal,
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
