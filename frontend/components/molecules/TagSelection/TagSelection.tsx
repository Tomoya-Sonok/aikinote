import type { FC } from "react";
import { Tag } from "@/components/atoms/Tag/Tag";
import styles from "./TagSelection.module.css";

interface TagSelectionProps {
	title: string;
	tags: string[];
	selectedTags: string[];
	onTagToggle: (tag: string) => void;
	onAddNew?: () => void;
	showAddButton?: boolean;
}

export const TagSelection: FC<TagSelectionProps> = ({
	title,
	tags,
	selectedTags,
	onTagToggle,
	onAddNew,
	showAddButton = true,
}) => {
	return (
		<div className={styles.container}>
			<div className={styles.titleButtonWrapper}>
				<div className={styles.header}>
					<h3 className={styles.title}>{title}</h3>
					{showAddButton && (
						<button type="button" className={styles.addButton} onClick={onAddNew}>
							＋追加
						</button>
					)}
				</div>
				<div className={styles.divider} />

				<div className={styles.tagsGrid}>
					{tags.map((tag) => (
						<Tag
							key={tag}
							variant={selectedTags.includes(tag) ? "default" : "selectable"}
							onClick={() => onTagToggle(tag)}
						>
							{tag}
						</Tag>
					))}
				</div>
			</div>
		</div>
	);
};
