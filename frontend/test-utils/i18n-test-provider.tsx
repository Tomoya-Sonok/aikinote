import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";

// テスト用のメッセージ
const testMessages = {
  components: {
    required: "必須",
    searchIcon: "検索",
  },
  filter: {
    searchPlaceholder: "フリーワードで絞り込む",
    tagLabel: "タグ",
    tagAlt: "タグ",
    dateLabel: "日付",
    dateAlt: "日付",
    notSpecified: "指定なし",
    selectDate: "日付で絞り込み",
  },
  pageModal: {
    title: "タイトル",
    tori: "取り",
    uke: "受け",
    waza: "技",
    content: "稽古内容",
    comment: "その他・コメント（補足や動画URL等）",
    required: "必須",
    titleRequired: "タイトルは必須です",
    contentRequired: "稽古内容は必須です",
    addNewTag: "新しいタグ名を入力",
    add: "追加",
    tagNameRequired: "タグ名を入力してください",
    tagNameTooLong: "タグ名は20文字以内で入力してください",
    tagNameInvalid: "タグ名は全角・半角英数字のみ使用可能です",
    invalidCategory: "無効なカテゴリです",
    loginRequired: "ログインが必要です",
    tagAdded: "タグが追加されました",
    tagAddFailed: "タグの追加に失敗しました",
    tagsFetchFailed: "タグの取得に失敗しました",
    initialTagsCreated: "初期タグを作成しました",
    initialTagsCreateFailed: "初期タグの作成に失敗しました",
    unknownError: "不明なエラー",
  },
  common: {
    save: "保存",
    cancel: "キャンセル",
    back: "戻る",
  },
  personalPages: {
    loading: "読み込み中...",
    loginRequired: "ログインが必要です。",
    goToLogin: "ログインページへ",
    dataFetchFailed: "データの取得に失敗しました",
    pageCreationFailed: "ページの作成に失敗しました",
    pageUpdateFailed: "ページの更新に失敗しました",
    pageCount: "これまでに作成したページ数は",
    pageCountSuffix: "ページです",
    recentPages: "最近作成したページ",
    showingAll: "全{total}件表示中",
    showingPartial: "全{total}件中{displayed}件表示中",
    loadMore: "もっと見る",
  },
  pageDetail: {
    loading: "読み込み中...",
    notFound: "ページが見つかりませんでした",
    backToList: "ページ一覧へ",
    edit: "編集",
    delete: "削除",
    deleteConfirm: "このページを削除してもよろしいですか？",
    content: "稽古内容",
    comment: "その他・コメント",
    updateFailed: "ページの更新に失敗しました",
  },
  tagSelection: {
    add: "＋追加",
  },
  tagManagement: {
    title: "タグ管理",
    loading: "タグを読み込み中...",
    categories: {
      tori: "取り",
      uke: "受け",
      waza: "技",
    },
    editAria: "{category}のタグを編集",
    editingHint: "×が表示されたタグを押すと削除できます",
    reorderHint:
      "タグを動かして並び替えることができます。×を押すとタグを削除できます。",
    empty: "登録済みのタグはありません",
    deleteSuccess: "タグを削除しました",
    deleteFailed: "タグの削除に失敗しました",
    fetchFailed: "タグの取得に失敗しました",
    authRequired: "ログイン状態を確認してください",
    saveOrder: "並び順を保存",
    orderSaving: "保存中...",
    orderSaveSuccess: "タグの並び順を保存しました",
    orderSaveFailed: "タグの並び順の保存に失敗しました",
  },
  tagFilterModal: {
    title: "タグで絞り込み",
    close: "閉じる",
    tori: "取り",
    uke: "受け",
    waza: "技",
    cancel: "キャンセル",
    filter: "絞り込み",
  },
  pageCreate: {
    title: "ページ作成",
    save: "保存",
  },
  datePickerModal: {
    close: "閉じる",
    prevMonth: "前の月",
    nextMonth: "次の月",
    cancel: "キャンセル",
    filter: "絞り込み",
    year: "年",
    months: {
      january: "1月",
      february: "2月",
      march: "3月",
      april: "4月",
      may: "5月",
      june: "6月",
      july: "7月",
      august: "8月",
      september: "9月",
      october: "10月",
      november: "11月",
      december: "12月",
    },
    days: {
      sunday: "日",
      monday: "月",
      tuesday: "火",
      wednesday: "水",
      thursday: "木",
      friday: "金",
      saturday: "土",
    },
  },
};

interface I18nTestProviderProps {
  children: ReactNode;
  locale?: string;
  messages?: Record<string, unknown>;
}

export function I18nTestProvider({
  children,
  locale = "ja",
  messages = testMessages,
}: I18nTestProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
