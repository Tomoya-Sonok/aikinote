import type { FC, ChangeEvent } from "react";
import { useState } from "react";
import Image from "next/image";
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
			<div className={styles.searchBox}>
				<Image
					src="/icons/search-icon.svg"
					alt="検索"
					width={13}
					height={14}
					className={styles.searchIcon}
				/>
				<input
					type="text"
					placeholder="フリーワードで絞り込む"
					value={searchText}
					onChange={handleSearchChange}
					className={styles.searchInput}
				/>
			</div>

			<div className={styles.filterRow}>
				<div className={styles.filterItem}>
					<Image
						src="/icons/tag-icon.svg"
						alt="タグ"
						width={24}
						height={24}
						className={styles.filterIcon}
					/>
					<span className={styles.filterLabel}>タグ</span>
					<span className={styles.filterValue}>{selectedTags}</span>
					<span className={styles.arrow}>＞</span>
				</div>

				<div className={styles.filterItem}>
					<Image
						src="/icons/calendar-icon.svg"
						alt="日付"
						width={24}
						height={24}
						className={styles.filterIcon}
					/>
					<span className={styles.filterLabel}>日付</span>
					<span className={styles.filterValue}>{selectedDate}</span>
					<span className={styles.arrow}>＞</span>
				</div>
			</div>
		</div>
	);
};
