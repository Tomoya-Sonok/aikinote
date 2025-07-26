import type { FC, ChangeEvent } from "react";
import { useState } from "react";
import { SearchInput } from "../../atoms/SearchInput/SearchInput";
import { FilterItem } from "../../atoms/FilterItem/FilterItem";
import styles from "./FilterSection.module.css";

interface FilterSectionProps {
	onSearchChange: (search: string) => void;
	onDateFilterChange: (date: string | null) => void;
	onTagFilterChange: (tags: string[]) => void;
}

export const FilterSection: FC<FilterSectionProps> = ({
	onSearchChange,
	onDateFilterChange,
	onTagFilterChange,
}) => {
	const [searchText, setSearchText] = useState("");
	const [selectedDate, setSelectedDate] = useState<string>("指定なし");
	const [selectedTags, setSelectedTags] = useState<string>("指定なし");

	const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchText(value);
		onSearchChange(value);
	};

	return (
		<div className={styles.filterContainer}>
			<SearchInput
				value={searchText}
				onChange={handleSearchChange}
				placeholder="フリーワードで絞り込む"
			/>

			<div className={styles.filterRow}>
				<FilterItem
					icon="/icons/tag-icon.svg"
					label="タグ"
					value={selectedTags}
					onClick={() => console.log("Tag filter clicked")}
				/>

				<FilterItem
					icon="/icons/calendar-icon.svg"
					label="日付"
					value={selectedDate}
					onClick={() => console.log("Date filter clicked")}
				/>
			</div>
		</div>
	);
};
