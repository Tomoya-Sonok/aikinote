import { redirect } from "next/navigation";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import styles from "./page.module.css";

export default async function SocialPostsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DefaultLayout>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>みんなで 投稿一覧</h1>
          <p className={styles.notice}>
            こちらのページは、初回リリース後に実装予定です。
            <br />
            リリース時期が分かり次第、ご登録いただいたメールアドレス宛にお知らせします。
          </p>
        </div>
      </div>
    </DefaultLayout>
  );
}

export const metadata = buildMetadata({
  title: "みんなで 投稿一覧",
  description: "AikiNoteユーザーの投稿を閲覧できるページです。",
});
