import { Suspense, type ReactNode } from "react";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { DefaultHeader } from "../common/DefaultHeader";
import styles from "./NotLoggedInLayout.module.css";

interface NotLoggedInLayoutProps {
	children: ReactNode;
	showHeader?: boolean;
	showFooter?: boolean;
	showTabNavigation?: boolean;
}

export function NotLoggedInLayout({
	children,
	showHeader = true,
	showFooter = false,
	showTabNavigation = true,
}: NotLoggedInLayoutProps) {
	return (
		<div className={styles.layout}>
			{showHeader && (
				<DefaultHeader
					user={null}
					showUserSection={false}
					showSettings={false}
				/>
			)}
			<div className={styles.contentWrapper}>
				<main className={styles.main}>{children}</main>
			</div>
			{showFooter && showTabNavigation && (
				<div className={styles.tabNavigation}>
					<Suspense fallback={null}>
						<TabNavigation />
					</Suspense>
				</div>
			)}
		</div>
	);
}
