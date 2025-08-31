"use client";

import { useEffect } from "react";

export const MSWComponent = () => {
	useEffect(() => {
		// プロダクションでは何もしない
		if (process.env.NODE_ENV !== "development") return;

		// ブラウザ環境でのみMSWを初期化
		if (typeof window === "undefined") return;

		const initMSW = async () => {
			try {
				const { worker } = await import("@/mocks/browser");
				await worker.start({
					onUnhandledRequest: "bypass",
				});
				console.log("MSW started successfully");
			} catch (error) {
				console.error("Failed to start MSW:", error);
			}
		};

		initMSW();
	}, []);

	// プロダクションでは何もレンダリングしない
	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	return null;
};
