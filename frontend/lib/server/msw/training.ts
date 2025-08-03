// 稽古ページデータの型定義
export type TrainingPageData = {
	id: string;
	title: string;
	content: string;
	date: string;
	tags: string[]; // 表示用では名前で保持、バックエンド連携時はIDに変換
};

// タグマッピング（ID → 名前）
const tagIdToNameMap: Record<string, string> = {
	"1": "立技",
	"2": "坐技",
	"3": "半身半立",
	"4": "相半身",
	"5": "逆半身",
	"6": "後ろ",
	"7": "片手取り",
	"8": "諸手取り",
	"9": "両手取り",
	"10": "袖取り",
	"11": "肩取り",
	"12": "肩取り面打ち",
	"13": "正面打ち",
	"14": "横面打ち",
	"15": "突き",
	"16": "一教",
	"17": "二教",
	"18": "三教",
	"19": "四教",
	"20": "五教",
	"21": "入身投げ",
	"22": "四方投げ",
	"23": "小手返し",
	"24": "回転投げ",
};

// モック稽古ページデータ（表示用に名前で保持）
const mockTrainingPageData: TrainingPageData[] = [
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
 * モック稽古ページデータを取得する関数
 * @returns Promise<TrainingPageData[]> 稽古ページデータの配列
 */
export async function mockGetTrainingPageData(): Promise<TrainingPageData[]> {
	// 実際のAPIコールをシミュレートするため、少しの遅延を追加
	await new Promise((resolve) => setTimeout(resolve, 100));

	return mockTrainingPageData;
}
