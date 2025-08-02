// トレーニングデータの型定義
export type TrainingData = {
	id: string;
	title: string;
	content: string;
	date: string;
	tags: string[];
};

// モックトレーニングデータ
const mockTrainingData: TrainingData[] = [
	{
		id: "1",
		title: "2025-09-09 10月の審査に向けて",
		content:
			"初級者の審査に向けて、正面打ち〜一教や入身投げが中心の稽古だった。受けも取りも、手刀を維持したまま体捌きを意識し ...",
		date: "2025-09-09",
		tags: ["一教", "立技", "正面打ち"],
	},
	{
		id: "2",
		title: "2025-09-17 剣の理合いを意識する",
		content:
			"西尾先生の剣の理合いに基づいた三教が興味深かった。正面打ちや横面打ちに対して、後の先をとる意識で入身と当身を行い ...",
		date: "2025-09-17",
		tags: ["三教", "四教", "立技", "正面打ち", "横面打ち", "小手返し"],
	},
	{
		id: "3",
		title: "2025-09-21",
		content:
			"初級者の審査に向けて、正面打ち→一教や入身投げが中心の稽古だった。受けも取りも、手刀を維持したまま体捌きを意識し ...",
		date: "2025-09-21",
		tags: ["一教", "立技", "正面打ち", "入身投げ"],
	},
];

/**
 * モックトレーニングデータを取得する関数
 * @returns Promise<TrainingData[]> トレーニングデータの配列
 */
export async function mockGetTrainingData(): Promise<TrainingData[]> {
	// 実際のAPIコールをシミュレートするため、少しの遅延を追加
	await new Promise((resolve) => setTimeout(resolve, 100));

	return mockTrainingData;
}
