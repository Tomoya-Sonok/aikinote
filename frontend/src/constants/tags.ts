export const INITIAL_USER_TAGS = [
  { category: "取り", name: "立技" },
  { category: "取り", name: "坐技" },
  { category: "取り", name: "半身半立" },
  { category: "受け", name: "相半身" },
  { category: "受け", name: "逆半身" },
  { category: "受け", name: "後ろ" },
  { category: "受け", name: "片手取り" },
  { category: "受け", name: "諸手取り" },
  { category: "受け", name: "両手取り" },
  { category: "受け", name: "肩取り" },
  { category: "受け", name: "正面打ち" },
  { category: "受け", name: "横面打ち" },
  { category: "受け", name: "突き" },
  { category: "受け", name: "肩取り面打ち" },
  { category: "技", name: "一教" },
  { category: "技", name: "二教" },
  { category: "技", name: "三教" },
  { category: "技", name: "四教" },
  { category: "技", name: "五教" },
  { category: "技", name: "入り身投げ" },
  { category: "技", name: "四方投げ" },
  { category: "技", name: "小手返し" },
  { category: "技", name: "回転投げ" },
  { category: "技", name: "腰投げ" },
  { category: "技", name: "天秤投げ" },
  { category: "技", name: "呼吸法" },
] as const;

// TODO: いずれは英語版も用意し、初期タグ登録の直前にダイアログでユーザーに選択させる
// その際、ダイアログのタイトルは「初期タグの言語を選択してください」とする
// 選択された言語（日本語 or English）に応じて、初期タグを登録する
