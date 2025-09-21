"use client";

import { useState, useRef } from "react";
import { getClientSupabase } from "@/lib/supabase/client";

interface ProfileImageUploadProps {
	currentImageUrl?: string;
	onUploadSuccess: (imageUrl: string) => void;
	onUploadError: (error: string) => void;
	disabled?: boolean;
}

interface UploadResponse {
	uploadUrl: string;
	fileKey: string;
	expiresIn: number;
}

export function ProfileImageUpload({
	currentImageUrl,
	onUploadSuccess,
	onUploadError,
	disabled = false,
}: ProfileImageUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const supabase = getClientSupabase();

	const validateFile = (file: File): string | null => {
		// ファイル形式のチェック
		const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		if (!allowedTypes.includes(file.type)) {
			return "有効な画像ファイルを選択してください（JPG、PNG、またはWebP）";
		}

		// ファイルサイズのチェック（1MB制限）
		if (file.size > 1024 * 1024) {
			return "ファイルサイズは1MB未満である必要があります";
		}

		return null;
	};

	const getUploadUrl = async (file: File): Promise<UploadResponse> => {
		console.log("アップロードURL取得リクエスト:", {
			filename: file.name,
			contentType: file.type,
			fileSize: file.size,
		});

		const response = await fetch("/api/upload-url", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				filename: file.name,
				contentType: file.type,
				fileSize: file.size,
			}),
		});

		console.log(
			"アップロードURL API レスポンス:",
			response.status,
			response.statusText,
		);

		if (!response.ok) {
			const errorData = await response.json();
			console.error("アップロードURL取得エラー:", errorData);
			throw new Error(errorData.error || "アップロードURLの取得に失敗しました");
		}

		const result = await response.json();
		console.log("アップロードURL取得成功:", result);
		return result;
	};

	const uploadToS3 = async (file: File, uploadUrl: string): Promise<void> => {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			// アップロード進捰の追跡
			xhr.upload.addEventListener("progress", (event) => {
				if (event.lengthComputable) {
					const progress = Math.round((event.loaded / event.total) * 100);
					setUploadProgress(progress);
				}
			});

			xhr.addEventListener("load", () => {
				if (xhr.status === 200) {
					resolve();
				} else {
					reject(
						new Error(`アップロードが失敗しました。ステータス: ${xhr.status}`),
					);
				}
			});

			xhr.addEventListener("error", () => {
				reject(new Error("アップロードに失敗しました"));
			});

			xhr.open("PUT", uploadUrl);
			xhr.setRequestHeader("Content-Type", file.type);
			xhr.send(file);
		});
	};

	const updateProfileImage = async (
		fileKey: string,
	): Promise<{ imageUrl: string }> => {
		const response = await fetch("/api/profile-image", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fileKey,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				errorData.error || "プロフィール画像の更新に失敗しました",
			);
		}

		return response.json();
	};

	const handleFileSelect = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file
		const validationError = validateFile(file);
		if (validationError) {
			onUploadError(validationError);
			return;
		}

		setIsUploading(true);
		setUploadProgress(0);

		try {
			// ステップ1: 署名付きアップロードURLを取得
			const { uploadUrl, fileKey } = await getUploadUrl(file);

			// ステップ2: S3にファイルをアップロード
			await uploadToS3(file, uploadUrl);

			// ステップ3: データベースのユーザープロフィールを更新
			const { imageUrl } = await updateProfileImage(fileKey);

			// ステップ4: 親コンポーネントに通知
			onUploadSuccess(imageUrl);
		} catch (error) {
			onUploadError(
				error instanceof Error ? error.message : "アップロードに失敗しました",
			);
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
			// ファイル入力をリセット
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="profile-image-upload">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/jpg,image/png,image/webp"
				onChange={handleFileSelect}
				disabled={disabled || isUploading}
				className="hidden"
			/>

			<div className="relative">
				<div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
					{currentImageUrl ? (
						<img
							src={currentImageUrl}
							alt="Profile"
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="text-gray-400 text-4xl">👤</div>
					)}
				</div>

				<button
					onClick={handleUploadClick}
					disabled={disabled || isUploading}
					className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
				>
					{isUploading ? (
						<div className="text-white text-center">
							<div className="text-sm">アップロード中...</div>
							<div className="text-xs">{uploadProgress}%</div>
						</div>
					) : (
						<div className="text-white text-sm">写真を変更</div>
					)}
				</button>
			</div>

			{isUploading && (
				<div className="mt-2 w-full bg-gray-200 rounded-full h-2">
					<div
						className="bg-blue-600 h-2 rounded-full transition-all duration-300"
						style={{ width: `${uploadProgress}%` }}
					/>
				</div>
			)}

			<div className="mt-2 text-xs text-gray-500 text-center">
				JPG、PNG、またはWebP • 最大1MB
			</div>
		</div>
	);
}
