"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MyPageContent } from "@/components/organisms/MyPageContent/MyPageContent";
import type { UserProfile } from "@/components/organisms/MyPageContent/MyPageContent";
import { useToast } from "@/contexts/ToastContext";
import { Loader } from "@/components/atoms/Loader/Loader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface MyPageClientProps {
	initialUser: UserProfile;
}

export default function MyPageClient({ initialUser }: MyPageClientProps) {
	const [user, setUser] = useState<UserProfile>(initialUser);
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const { showToast } = useToast();

	const fetchUserProfile = async () => {
		setLoading(true);
		try {
			// JWTトークンを取得
			const tokenResponse = await fetch("/api/auth/token", {
				method: "POST",
			});

			if (!tokenResponse.ok) {
				throw new Error("認証トークンの取得に失敗しました");
			}

			const tokenData = await tokenResponse.json();
			const token = tokenData.data.token;

			// Hono APIからプロフィール取得
			const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
				method: "GET",
				headers: {
					"Authorization": `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || "プロフィールの取得に失敗しました");
			}

			const result = await response.json();
			setUser(result.data);
		} catch (error) {
			console.error("プロフィール取得エラー:", error);
			showToast("プロフィールの取得に失敗しました", "error");
		} finally {
			setLoading(false);
		}
	};

	// マイページアクセス時に最新プロフィールを取得
	useEffect(() => {
		fetchUserProfile();
	}, []);

	if (loading) {
		return <Loader size="medium" centered text="プロフィール情報を読み込み中..." />;
	}

	return <MyPageContent user={user} />;
}