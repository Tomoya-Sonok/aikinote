"use client";

import type { FC } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
	type FontSize,
	useFontSizeStore,
	fontSizeToIndex,
	indexToFontSize,
} from "@/stores/fontSizeStore";
import { Button } from "@/components/atoms/Button/Button";
import { useTranslations } from "next-intl";
import styles from "./FontSizeSetting.module.css";

interface FontSizeSettingProps {
	onSave?: () => void;
	className?: string;
}

export const FontSizeSetting: FC<FontSizeSettingProps> = ({
	onSave,
	className = "",
}) => {
	const { fontSize, setFontSize } = useFontSizeStore();
	const t = useTranslations();

	const handleSliderChange = (value: number[]) => {
		const newFontSize = indexToFontSize(value[0]);
		setFontSize(newFontSize);
	};

	const handleLabelClick = (targetFontSize: FontSize) => {
		setFontSize(targetFontSize);
	};

	const fontSizes: FontSize[] = ["small", "medium", "large"];

	const getFontSizeLabel = (fontSize: FontSize): string => {
		return t(`fontSize.${fontSize}`);
	};

	return (
		<div className={styles.container}>
			<p className={styles.description}>
				{t("fontSize.description")}
			</p>

			<div className={styles.settingArea}>
				{/* プレビュー */}
				<div className={styles.preview} data-font-size={fontSize}>
					<p className={styles.previewText}>
						{t("fontSize.previewText")}
					</p>
					<Button variant="primary" size="medium">
						{t("fontSize.sampleButton")}
					</Button>
				</div>

				{/* スライダー */}
				<div className={styles.sliderContainer}>
					<Slider.Root
						className={styles.sliderRoot}
						value={[fontSizeToIndex(fontSize)]}
						onValueChange={handleSliderChange}
						max={2}
						min={0}
						step={1}
					>
						<Slider.Track className={styles.sliderTrack}>
							<Slider.Range className={styles.sliderRange} />
						</Slider.Track>
						<Slider.Thumb
							className={styles.sliderThumb}
							aria-label={t("fontSize.title")}
						/>
					</Slider.Root>

					<div className={styles.labels}>
						{fontSizes.map((size) => (
							<button
								key={size}
								type="button"
								className={`${styles.label} ${
									fontSize === size ? styles.labelActive : ""
								}`}
								onClick={() => handleLabelClick(size)}
							>
								{getFontSizeLabel(size)}
							</button>
						))}
					</div>
				</div>

				{onSave && (
					<div className={styles.actions}>
						<Button variant="primary" onClick={onSave}>
							{t("fontSize.saveButton")}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
