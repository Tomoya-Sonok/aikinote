// 稽古ページデータの型定義
export type TrainingPageData = {
	id: string;
	title: string;
	content: string;
	comment?: string;
	date: string;
	tags: string[]; // 表示用では名前で保持、バックエンド連携時はIDに変換
};

// ユーザー情報の型定義
export type MockUser = {
	id: string;
	username: string;
	email: string;
	avatarUrl?: string;
	dojo?: string;
};

// モックユーザーデータ
const mockUser: MockUser = {
	id: "mock-user-1",
	username: "山田太郎",
	email: "yamada@example.com",
	avatarUrl: "/images/default-avatar.svg",
	dojo: "合気道練習館",
};

// モック認証関数
export const mockGetCurrentUser = async (): Promise<MockUser | null> => {
	// 開発環境ではログイン済みとして扱う
	if (process.env.NODE_ENV === "development") {
		// 実際のAPIコールを模擬する遅延
		await new Promise((resolve) => setTimeout(resolve, 100));
		return mockUser;
	}
	return null;
};

// モックソーシャル投稿データの型定義
export type SocialPost = {
	id: string;
	authorId: string;
	authorName: string;
	authorAvatar?: string;
	title: string;
	content: string;
	tags: string[];
	createdAt: string;
	likesCount: number;
	commentsCount: number;
};

// モックソーシャル投稿データ
const mockSocialPosts: SocialPost[] = [
	{
		id: "post-1",
		authorId: "user-2",
		authorName: "佐藤花子",
		authorAvatar: "/images/default-avatar.svg",
		title: "四方投げのコツについて",
		content:
			"四方投げを練習していて、相手のバランスを崩すタイミングが分からず困っています。どなたかアドバイスをいただけませんか？",
		tags: ["四方投げ", "質問", "初心者"],
		createdAt: "2025-09-10",
		likesCount: 5,
		commentsCount: 3,
	},
	{
		id: "post-2",
		authorId: "user-3",
		authorName: "田中一郎",
		authorAvatar: "/images/default-avatar.svg",
		title: "昨日の稽古で学んだこと",
		content:
			"入身投げの際の足捌きについて、先生から指導を受けました。相手の正面から入るのではなく、斜めに入身することで、より自然に技が決まることを学びました。",
		tags: ["入身投げ", "足捌き", "気づき"],
		createdAt: "2025-09-09",
		likesCount: 8,
		commentsCount: 2,
	},
	{
		id: "post-3",
		authorId: "user-4",
		authorName: "鈴木次郎",
		authorAvatar: "/images/default-avatar.svg",
		title: "審査に向けての練習",
		content:
			"来月の昇級審査に向けて、基本技の復習をしています。特に正面打ち一教の精度を上げたいと思っています。",
		tags: ["審査", "一教", "正面打ち"],
		createdAt: "2025-09-08",
		likesCount: 12,
		commentsCount: 7,
	},
];

// モックソーシャル投稿取得関数
export const mockGetSocialPosts = async (): Promise<SocialPost[]> => {
	// 実際のAPIコールを模擬する遅延
	await new Promise((resolve) => setTimeout(resolve, 500));
	return mockSocialPosts;
};

// モック稽古ページデータ（表示用に名前で保持）
const mockTrainingPageData: TrainingPageData[] = [
	{
		id: "1",
		title: "2025-09-09 10月の審査に向けて",
		content:
			"初級者の審査に向けて、正面打ち〜一教や入身投げが中心の稽古だった。受けも取りも、手刀を維持したまま体捌きを意識し、相手との接点を大切にしながら技をかけるように心がけた。\n\n特に一教では、相手の力に逆らわず、自分の中心を保ちながら相手を導くことの重要性を再認識した。入身投げも同様で、相手の動きに合わせて自然な流れで投げることができれば、力を使わずに技が決まることを実感した。",
		comment:
			"補足：審査に向けての稽古内容を記録。手刀の維持と体捌きの重要性を再確認。",
		date: "2025-09-09",
		tags: ["一教", "立技", "正面打ち"],
	},
	{
		id: "2",
		title: "2025-09-17 剣の理合いを意識する",
		content:
			"逆半身の一教など一部例外はあれど、基本的にどんな技をするときにも「手刀」の形を維持する。そして剣対剣・剣対杖の動きを意識し、いつでも切れる（当て身が入る）が切らないように相手を導くように手刀を使う。\n\n正面打ち 小手返し\n・相手との接点・繋がりを保つため、外転換するときに目線を外したりせずしっかり自分の中心で相手を崩す\n・角度も大事、相手の腕が伸びるように（相手の重心が崩れるように）重心移動し、最後まで自分の中心に収めることを意識する\n\n三教の極め\n・相手の肘が真っ直ぐ上に立ち、自分の中心から相手の肘までが1本の線になるようにして極める\n\n三教の極めに移る前に、相手の手首や掌の外側ではなくちゃんと小指を引っ掛けて持つことを意識していきたい。持つ部分が数センチずれるだけで技が効きにくくなる。",
		comment:
			"補足：審査に向けての稽古内容を記録。手刀の維持と体捌きの重要性を再確認。",
		date: "2025-09-17",
		tags: ["三教", "四教", "立技", "正面打ち", "横面打ち", "小手返し"],
	},
	{
		id: "3",
		title: "2025-09-21",
		content:
			"初級者の審査に向けて、正面打ち→一教や入身投げが中心の稽古だった。受けも取りも、手刀を維持したまま体捌きを意識し、相手との接点を大切にしながら技をかけるように心がけた。\n\n今日は特に呼吸法と姿勢について指導を受けた。正しい呼吸と姿勢があってこそ、技が生きてくることを改めて学んだ。",
		comment:
			"補足：審査に向けての稽古内容を記録。手刀の維持と体捌きの重要性を再確認。",
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

/**
 * IDで特定の稽古ページデータを取得する関数
 * @param id 稽古ページのID
 * @returns Promise<TrainingPageData | null> 稽古ページデータまたはnull
 */
export async function mockGetTrainingPageDataById(
	id: string,
): Promise<TrainingPageData | null> {
	// 実際のAPIコールをシミュレートするため、少しの遅延を追加
	await new Promise((resolve) => setTimeout(resolve, 100));

	const page = mockTrainingPageData.find((page) => page.id === id);
	return page || null;
}
