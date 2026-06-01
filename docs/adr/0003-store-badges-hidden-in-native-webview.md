# ストアダウンロードバッジはネイティブ WebView 内では非表示にする

App Store / Google Play のダウンロードバッジは、ネイティブアプリ（Expo WebView）内では一切描画しない。Web ブラウザ（Safari / Chrome 等）でアクセスされた場合のみ両バッジを表示する。判定は `window.__AIKINOTE_NATIVE_APP__`（既存ユーティリティ `isNativeApp()`）で行う。

## なぜ

AikiNote の iOS ネイティブアプリは Web を WebView で表示しており、ビルド 1.0 (27) は **App Store Guideline 2.3.10（Accurate Metadata）** で「Android references と Google Play references を除去せよ」とリジェクトされた経緯がある（#314, 2026-05-19）。同じ Web ページ（特にネイティブ起動時に必ず開かれる `/signup`）に Google Play バッジを無条件で置けば、再リジェクト確実である。アプリ内で「アプリをダウンロード」を促す UX 上の必要性も無いため、両バッジとも非表示が最も整合する。

## Considered Options

- **「Web 確定後に表示」方式（採用）**: `StoreBadges` をクライアントコンポーネントとし、デフォルトで `null` を返す。マウント後に `isNativeApp() === false` を確認できたときのみ表示する。SSR HTML にバッジが含まれないため、iOS WebView 上で一瞬「Google Play」が出るフラッシュが発生しない。Web ではハイドレーション直後に表示される（軽微な遅延）。
- **「表示してから非表示にする」方式（不採用）**: `{!isNativeApp && <Badges/>}` の素直な実装。SSR HTML にバッジが含まれるため、ネイティブ WebView では初回描画でバッジが一瞬見えてから消える。Apple 手動レビューで拾われる残存リスクがあるため不採用。
- **iOS のみ Google Play を隠す（不採用）**: iOS / Android の判別ロジックを新規追加する必要があり、また「アプリ内に自アプリの DL バッジが残る」UX の不自然さが残るため不採用。

## Consequences

- `StoreBadges` を新規追加する場所では必ずこのコンポーネント経由で配置し、生のリンク／画像をネイティブで露出させないこと。
- FAQ「スマホアプリはありますか？」の回答本文は「以下からダウンロード可能です」と書いており、バッジに依存している。LP/FAQ がネイティブで表示されることは通常無いが（起動時 `/signup` 直行）、表示された場合は「以下から」の指す先が消える軽微な不整合を許容する。
- 本文には「Google Play」「Android」の語を新たに追加しないこと（同 2.3.10 違反になる）。バッジの alt 属性はコンポーネント内に閉じており、ネイティブでは要素ごと描画されないため問題ない。
