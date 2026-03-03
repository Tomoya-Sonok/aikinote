import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteFileFromS3,
  extractFileKeyFromUrl,
  generatePublicUrl,
} from "@/lib/aws-s3";
import { revalidateUserProfile } from "@/lib/server/cache";
import { getServerSupabase } from "@/lib/supabase/server";

// リクエストボディのバリデーションスキーマ
const profileImageSchema = z.object({
  fileKey: z.string().min(1, "ファイルキーが必要です"),
});

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの解析と検証
    const body = await request.json();
    const { fileKey } = profileImageSchema.parse(body);

    // Supabaseクライアントの初期化
    const supabase = await getServerSupabase();

    // 認証済みユーザーの取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Verify that the file key belongs to the authenticated user
    if (!fileKey.startsWith(`users/${user.id}/`)) {
      return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
    }

    // Get current user profile to check for existing image
    const { data: currentProfile, error: profileError } = await supabase
      .from("User")
      .select("profile_image_url")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching current profile:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch current profile" },
        { status: 500 },
      );
    }

    // Delete old image from S3 if it exists
    if (currentProfile?.profile_image_url) {
      try {
        const oldFileKey = extractFileKeyFromUrl(
          currentProfile.profile_image_url,
        );
        if (oldFileKey?.startsWith(`users/${user.id}/`)) {
          await deleteFileFromS3(oldFileKey);
        }
      } catch (error) {
        console.warn("Failed to delete old image from S3:", error);
        // Continue with the update even if deletion fails
      }
    }

    // Generate public URL for the new image
    const imageUrl = generatePublicUrl(fileKey);

    // Update user profile with new image URL
    const { error: updateError } = await supabase
      .from("User")
      .update({
        profile_image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile image:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile image" },
        { status: 500 },
      );
    }

    revalidateUserProfile(user.id);

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "Profile image updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile image:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    // Supabaseクライアントの初期化
    const supabase = await getServerSupabase();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Get current user profile
    const { data: currentProfile, error: profileError } = await supabase
      .from("User")
      .select("profile_image_url")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching current profile:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch current profile" },
        { status: 500 },
      );
    }

    // Delete image from S3 if it exists
    if (currentProfile?.profile_image_url) {
      try {
        const fileKey = extractFileKeyFromUrl(currentProfile.profile_image_url);
        if (fileKey?.startsWith(`users/${user.id}/`)) {
          await deleteFileFromS3(fileKey);
        }
      } catch (error) {
        console.warn("Failed to delete image from S3:", error);
        // Continue with the update even if deletion fails
      }
    }

    // Remove profile image URL from database
    const { error: updateError } = await supabase
      .from("User")
      .update({
        profile_image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error removing profile image:", updateError);
      return NextResponse.json(
        { error: "Failed to remove profile image" },
        { status: 500 },
      );
    }

    revalidateUserProfile(user.id);

    return NextResponse.json({
      success: true,
      message: "Profile image removed successfully",
    });
  } catch (error) {
    console.error("Error removing profile image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
