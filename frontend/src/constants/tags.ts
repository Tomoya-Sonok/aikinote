export const INITIAL_USER_TAGS = [
  { category: "取り", name: "相半身" },
  { category: "取り", name: "逆半身" },
  { category: "取り", name: "正面" },
  { category: "受け", name: "片手取り" },
  { category: "受け", name: "諸手取り" },
  { category: "受け", name: "肩取り" },
  { category: "技", name: "四方投げ" },
  { category: "技", name: "入り身投げ" },
  { category: "技", name: "小手返し" },
] as const;

// TODO: いずれは英語版も用意し、初期タグ登録の直前にダイアログでユーザーに選択させる
// その際、ダイアログのタイトルは「初期タグの言語を選択してください」とする
// 選択された言語（日本語 or English）に応じて、初期タグを登録する
