import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { SocialReplyItem } from "./SocialReplyItem";

const socialPostsMessages = {
  components: {
    profileImage: "プロフィール画像",
  },
  socialPosts: {
    edited: "編集済み",
    menuEdit: "編集",
    menuDelete: "削除",
    menuReport: "通報",
    editCancel: "キャンセル",
    editSave: "保存",
    favorite: "お気に入り",
    reportReplyTitle: "返信を通報",
    deleteReplyConfirm: "この返信を削除しますか？",
  },
};

const replierId = "replier-42";
const replierUsername = "hanako_budo";

const baseReply = {
  id: "reply-1",
  user_id: replierId,
  content: "素晴らしい稽古記録ですね！",
  favorite_count: 0,
  created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  user: {
    id: replierId,
    username: replierUsername,
    profile_image_url: null,
  },
  is_favorited: false,
};

function renderReply(
  overrides: Partial<React.ComponentProps<typeof SocialReplyItem>> = {},
) {
  const props: React.ComponentProps<typeof SocialReplyItem> = {
    reply: baseReply,
    currentUserId: "viewer-1",
    isAuthenticated: true,
    onReport: vi.fn(),
    onEdit: vi.fn(async () => {}),
    onDelete: vi.fn(async () => {}),
    onFavoriteToggle: vi.fn(),
    onUnauthenticatedAction: vi.fn(),
    ...overrides,
  };

  render(
    <I18nTestProvider messages={socialPostsMessages}>
      <SocialReplyItem {...props} />
    </I18nTestProvider>,
  );

  return props;
}

describe("SocialReplyItem", () => {
  it("認証済みユーザーには返信者ユーザー名が /social/profile/[username] へのリンクとして描画される", () => {
    // Arrange & Act
    renderReply();

    // Assert
    const usernameLink = screen.getByRole("link", { name: replierUsername });
    expect(usernameLink).toHaveAttribute(
      "href",
      `/ja/social/profile/${replierUsername}`,
    );
  });

  it("認証済みユーザーには返信者プロフィール画像もプロフィール画面リンクとして描画される", () => {
    // Arrange & Act
    renderReply();

    // Assert
    const profileLinks = screen
      .getAllByRole("link")
      .filter(
        (el) =>
          el.getAttribute("href") === `/ja/social/profile/${replierUsername}`,
      );
    expect(profileLinks).toHaveLength(2);
  });

  it("未認証ユーザーが返信者のユーザー名をタップするとonUnauthenticatedActionが呼ばれる", async () => {
    // Arrange
    const onUnauthenticatedAction = vi.fn();
    renderReply({ isAuthenticated: false, onUnauthenticatedAction });

    // Act
    await userEvent.click(
      screen.getByRole("button", { name: replierUsername }),
    );

    // Assert
    expect(onUnauthenticatedAction).toHaveBeenCalledTimes(1);
  });

  it("未認証ユーザーが返信者のプロフィール画像をタップするとonUnauthenticatedActionが呼ばれる", async () => {
    // Arrange
    const onUnauthenticatedAction = vi.fn();
    renderReply({ isAuthenticated: false, onUnauthenticatedAction });

    // Act
    const buttons = screen.getAllByRole("button");
    const imageButton = buttons.find((btn) =>
      btn.querySelector("img, svg, [class*='profileImage']"),
    );
    expect(imageButton).toBeDefined();
    await userEvent.click(imageButton as HTMLElement);

    // Assert
    expect(onUnauthenticatedAction).toHaveBeenCalledTimes(1);
  });

  it("未認証ユーザー向けの描画ではプロフィールリンクは存在しない", () => {
    // Arrange & Act
    renderReply({ isAuthenticated: false });

    // Assert
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
