import type { FC } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
	type FontSize,
	useFontSizeStore,
	getFontSizeLabel,
	fontSizeToIndex,
	indexToFontSize,
} from "@/stores/fontSizeStore";
import { Button } from "@/components/atoms/Button/Button";
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

	const handleSliderChange = (value: number[]) => {
		const newFontSize = indexToFontSize(value[0]);
		setFontSize(newFontSize);
	};

	const handleLabelClick = (targetFontSize: FontSize) => {
		setFontSize(targetFontSize);
	};

	const fontSizes: FontSize[] = ["small", "medium", "large"];

	return (
		<div className={styles.container}>
			<p className={styles.description}>
				読みやすい文字サイズを選択してください
			</p>

			<div className={styles.settingArea}>
				{/* プレビュー */}
				<div className={styles.preview} data-font-size={fontSize}>
					<p className={styles.previewText}>
						合気道の練習内容をここに記録します。技の名前や感想、上達のポイントなどを書き残しておきましょう。
					</p>
					<Button variant="primary" size="medium">
						サンプルボタン
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
							aria-label="フォントサイズ"
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
							保存する
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
