// 稽古ページデータの型定義
export type TrainingPage = {
	id: string;
	title: string;
	content: string;
	date: string;
	tags: string[]; // training_tagsテーブルのIDを配列で格納
	user_id: string;
	created_at: string;
	updated_at: string;
};

// 稽古タグの型定義
export type TrainingTag = {
	id: string;
	name: string;
	category: string; // "取り" | "受け" | "技"
	created_at: string;
	updated_at: string;
};

// ユーザーの型定義
export type User = {
	id: string;
	email: string;
	name: string;
	created_at: string;
	updated_at: string;
};

// 道場の型定義
export type Dojo = {
	id: string;
	name: string;
	address?: string;
	created_at: string;
	updated_at: string;
};

// モック稽古タグデータ（事前定義タグ）
export const mockTrainingTags: TrainingTag[] = [
	// 取り
	{
		id: "1",
		name: "立技",
		category: "取り",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "2",
		name: "坐技",
		category: "取り",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "3",
		name: "半身半立",
		category: "取り",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},

	// 受け
	{
		id: "4",
		name: "相半身",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "5",
		name: "逆半身",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "6",
		name: "後ろ",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "7",
		name: "片手取り",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "8",
		name: "諸手取り",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "9",
		name: "両手取り",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "10",
		name: "袖取り",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "11",
		name: "肩取り",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "12",
		name: "肩取り面打ち",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "13",
		name: "正面打ち",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "14",
		name: "横面打ち",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "15",
		name: "突き",
		category: "受け",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},

	// 技
	{
		id: "16",
		name: "一教",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "17",
		name: "二教",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "18",
		name: "三教",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "19",
		name: "四教",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "20",
		name: "五教",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "21",
		name: "入身投げ",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "22",
		name: "四方投げ",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "23",
		name: "小手返し",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "24",
		name: "回転投げ",
		category: "技",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
];

// モック稽古ページデータ（タグはIDで参照）
export const mockTrainingPages: TrainingPage[] = [
	{
		id: "1",
		title: "2025-09-09 10月の審査に向けて",
		content:
			"初級者の審査に向けて、正面打ち〜一教や入身投げが中心の稽古だった。受けも取りも、手刀を維持したまま体捌きを意識し ...",
		date: "2025-09-09",
		tags: ["16", "1", "13"], // 一教、立技、正面打ち
		user_id: "mock-user-123",
		created_at: "2025-09-09T00:00:00Z",
		updated_at: "2025-09-09T00:00:00Z",
	},
	{
		id: "2",
		title: "2025-09-17 剣の理合いを意識する",
		content:
			"西尾先生の剣の理合いに基づいた三教が興味深かった。正面打ちや横面打ちに対して、後の先をとる意識で入身と当身を行い ...",
		date: "2025-09-17",
		tags: ["18", "19", "1", "13", "14", "23"], // 三教、四教、立技、正面打ち、横面打ち、小手返し
		user_id: "mock-user-123",
		created_at: "2025-09-17T00:00:00Z",
		updated_at: "2025-09-17T00:00:00Z",
	},
	{
		id: "3",
		title: "2025-09-21",
		content:
			"初級者の審査に向けて、正面打ち→一教や入身投げが中心の稽古だった。受けも取りも、手刀を維持したまま体捌きを意識し ...",
		date: "2025-09-21",
		tags: ["16", "1", "13", "21"], // 一教、立技、正面打ち、入身投げ
		user_id: "mock-user-123",
		created_at: "2025-09-21T00:00:00Z",
		updated_at: "2025-09-21T00:00:00Z",
	},
];
