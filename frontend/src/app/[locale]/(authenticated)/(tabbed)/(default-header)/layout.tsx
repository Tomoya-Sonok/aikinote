import { AuthenticatedHeader } from "@/components/shared/layouts/common/DefaultHeader/AuthenticatedHeader";
import layoutStyles from "@/components/shared/layouts/DefaultLayout/DefaultLayout.module.css";

// /personal/pages, /personal/pages/[page_id], /mypage で DefaultHeader を共有する。
// page 間 navigation 時に Header と main の枠が維持され main の中身だけ差し替わる。
export default function DefaultHeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthenticatedHeader />
      <div className={layoutStyles.contentWrapper}>
        <main className={layoutStyles.main}>{children}</main>
      </div>
    </>
  );
}
