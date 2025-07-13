import type { FC } from "react";
import Image from "next/image";
import styles from "./TabNavigation.module.css";

interface TabItem {
	id: string;
	label: string;
	icon: string;
	href?: string;
}

interface TabNavigationProps {
	activeTab: string;
	onTabChange: (tabId: string) => void;
}

const tabs: TabItem[] = [
	{
		id: "personal",
		label: "ひとりで",
		icon: "/icons/edit-icon.svg",
	},
	{
		id: "community",
		label: "みんなで",
		icon: "/icons/message-chat-icon.svg",
	},
	{
		id: "mypage",
		label: "マイページ",
		icon: "/icons/user-profile-icon.svg",
	},
];

export const TabNavigation: FC<TabNavigationProps> = ({
	activeTab,
	onTabChange,
}) => {
	return (
		<div className={styles.tabContainer}>
			{tabs.map((tab) => (
				<button
					key={tab.id}
					className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
					onClick={() => onTabChange(tab.id)}
					type="button"
				>
					<div className={styles.tabContent}>
						<Image
							src={tab.icon}
							alt={tab.label}
							width={32}
							height={32}
							className={styles.icon}
						/>
						<span className={styles.label}>{tab.label}</span>
					</div>
				</button>
			))}
		</div>
	);
};
