import type { FC } from "react";
import { useEffect, useState } from "react";
import { TextArea } from "@/components/atoms/TextArea/TextArea";
import { TextInput } from "@/components/atoms/TextInput/TextInput";
import { TagSelection } from "@/components/molecules/TagSelection/TagSelection";
import { trpc } from "@/lib/shared/trpc";
import styles from "./PageCreateModal.module.css";

interface PageCreateModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (pageData: PageCreateData) => void;
}

export interface PageCreateData {
	title: string;
	tori: string[];
	uke: string[];
	waza: string[];
	content: string;
	comment: string;
}

export const PageCreateModal: FC<PageCreateModalProps> = ({
	isOpen,
	onClose,
	onSave,
}) => {
	const today = new Date().toISOString().split("T")[0];

	const [formData, setFormData] = useState<PageCreateData>({
		title: `${today} `,
		tori: [],
		uke: [],
		waza: [],
		content: "",
		comment: "",
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [toriTags, setToriTags] = useState<string[]>([]);
	const [ukeTags, setUkeTags] = useState<string[]>([]);
	const [wazaTags, setWazaTags] = useState<string[]>([]);

	const { data: allTags, error } = trpc.trainingTags.getAllTags.useQuery(
		undefined,
		{
			enabled: isOpen,
		},
	);

	useEffect(() => {
		if (allTags) {
			const tori = allTags
				.filter((tag: { category: string }) => tag.category === "取り")
				.map((tag: { name: string }) => tag.name);
			const uke = allTags
				.filter((tag: { category: string }) => tag.category === "受け")
				.map((tag: { name: string }) => tag.name);
			const waza = allTags
				.filter((tag: { category: string }) => tag.category === "技")
				.map((tag: { name: string }) => tag.name);

			setToriTags(tori);
			setUkeTags(uke);
			setWazaTags(waza);
		}
	}, [allTags]);

	useEffect(() => {
		if (error) {
			console.error("Failed to fetch tags:", error);
		}
	}, [error]);

	const handleTagToggle = (category: keyof PageCreateData, tag: string) => {
		setFormData((prev) => {
			const currentTags = prev[category] as string[];
			const newTags = currentTags.includes(tag)
				? currentTags.filter((t) => t !== tag)
				: [...currentTags, tag];

			return {
				...prev,
				[category]: newTags,
			};
		});
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.title.trim()) {
			newErrors.title = "タイトルは必須です";
		}

		if (!formData.content.trim()) {
			newErrors.content = "稽古内容は必須です";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSave = () => {
		if (validateForm()) {
			onSave(formData);
			handleClose();
		}
	};

	const handleClose = () => {
		setFormData({
			title: `${today} `,
			tori: [],
			uke: [],
			waza: [],
			content: "",
			comment: "",
		});
		setErrors({});
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div
			className={styles.overlay}
			onClick={handleClose}
			onKeyDown={(e) => e.key === "Escape" && handleClose()}
			role="dialog"
			aria-modal="true"
		>
			<dialog
				open
				className={styles.modal}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<div className={styles.header}>
					<h2 className={styles.title}>ページ作成</h2>
				</div>

				<div className={styles.content}>
					<div className={styles.section}>
						<TextInput
							label="タイトル"
							required
							value={formData.title}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, title: e.target.value }))
							}
							error={errors.title}
						/>
					</div>

					<div className={styles.section}>
						<TagSelection
							title="取り"
							tags={toriTags}
							selectedTags={formData.tori}
							onTagToggle={(tag) => handleTagToggle("tori", tag)}
						/>
					</div>

					<div className={styles.section}>
						<TagSelection
							title="受け"
							tags={ukeTags}
							selectedTags={formData.uke}
							onTagToggle={(tag) => handleTagToggle("uke", tag)}
						/>
					</div>

					<div className={styles.section}>
						<TagSelection
							title="技"
							tags={wazaTags}
							selectedTags={formData.waza}
							onTagToggle={(tag) => handleTagToggle("waza", tag)}
						/>
					</div>

					<div className={styles.section}>
						<TextArea
							label="稽古内容"
							required
							value={formData.content}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, content: e.target.value }))
							}
							error={errors.content}
							rows={5}
						/>
					</div>

					<div className={styles.section}>
						<TextArea
							label="その他・コメント（補足や動画URL等）"
							value={formData.comment}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, comment: e.target.value }))
							}
							rows={3}
						/>
					</div>
				</div>

				<div className={styles.footer}>
					<button
						type="button"
						className={styles.cancelButton}
						onClick={handleClose}
					>
						キャンセル
					</button>
					<button
						type="button"
						className={styles.saveButton}
						onClick={handleSave}
					>
						保存
					</button>
				</div>
			</dialog>
		</div>
	);
};
