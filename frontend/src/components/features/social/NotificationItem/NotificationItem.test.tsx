import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { NotificationItem } from "./NotificationItem";

const socialPostsMessages = {
  components: {
    profileImage: "プロフィール画像",
  },
  socialPosts: {
    notificationReply: "{name}さんが返信しました",
    notificationReplyToThread: "{name}さんがスレッドに返信しました",
    notificationFavorite: "{name}さんがお気に入りしました",
    notificationFavoriteReply: "{name}さんが返信をお気に入りしました",
    notificationReplyDeleted: "削除された返信",
    profile: "プロフィール",
  },
};

const actorUserId = "aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb";
const actorUsername = "taro_budo";
const postId = "post-xyz";

const baseNotification = {
  id: "notif-1",
  type: "reply",
  recipient_user_id: "recipient-0",
  actor_user_id: actorUserId,
  post_id: postId,
  reply_id: "reply-9",
  is_read: false,
  created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  actor: {
    id: actorUserId,
    username: actorUsername,
    profile_image_url: null,
  },
  post_preview: "内容",
  reply_is_deleted: null,
  reply_deleted_at: null,
};

function renderNotification(overrides: Partial<typeof baseNotification> = {}) {
  render(
    <I18nTestProvider messages={socialPostsMessages}>
      <NotificationItem notification={{ ...baseNotification, ...overrides }} />
    </I18nTestProvider>,
  );
}

describe("NotificationItem", () => {
  it("プロフィール画像は /social/profile/[username] へのリンクとして描画される", () => {
    // Arrange & Act
    renderNotification();

    // Assert
    const profileLink = screen.getByRole("link", { name: "プロフィール" });
    expect(profileLink).toHaveAttribute(
      "href",
      `/ja/social/profile/${actorUsername}`,
    );
  });

  it("actorが欠落している場合はプロフィールリンクを張らない", () => {
    // Arrange & Act
    renderNotification({ actor: null });

    // Assert
    expect(screen.queryByRole("link", { name: "プロフィール" })).toBeNull();
  });
});
