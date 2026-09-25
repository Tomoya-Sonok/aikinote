/**
 * フィードキャッシュ操作のテスト
 * 投稿詳細の仮表示に使う検索と、ブロック時の投稿除去を検証する
 */
import {
  type InfiniteData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SocialFeedPostData } from "@/components/features/social/SocialPostCard/SocialPostCard";
import {
  findPostInSocialFeedCache,
  socialFeedQueryKey,
  useRemoveUserPostsFromSocialFeedCache,
} from "./useSocialFeed";

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "viewer" } }),
}));

type FeedPage = { posts: SocialFeedPostData[]; next_offset: number | null };

const post = (id: string, userId: string) =>
  ({ id, user_id: userId, content: `投稿 ${id}` }) as SocialFeedPostData;

const seedFeed = (
  client: QueryClient,
  tab: "all" | "training" | "favorites",
  posts: SocialFeedPostData[],
) =>
  client.setQueryData<InfiniteData<FeedPage>>(
    socialFeedQueryKey("viewer", tab),
    { pages: [{ posts, next_offset: null }], pageParams: [0] },
  );

describe("findPostInSocialFeedCache", () => {
  it("どのタブのキャッシュにある投稿でも見つけられる", () => {
    // Arrange
    const client = new QueryClient();
    seedFeed(client, "all", [post("p1", "u1")]);
    seedFeed(client, "favorites", [post("p2", "u2")]);

    // Act
    const found = findPostInSocialFeedCache(client, "p2");

    // Assert
    expect(found?.content).toBe("投稿 p2");
  });

  it("キャッシュに無い投稿は undefined を返す", () => {
    // Arrange
    const client = new QueryClient();
    seedFeed(client, "all", [post("p1", "u1")]);

    // Act
    const found = findPostInSocialFeedCache(client, "missing");

    // Assert
    expect(found).toBeUndefined();
  });
});

describe("useRemoveUserPostsFromSocialFeedCache", () => {
  it("ブロックしたユーザーの投稿を全タブのキャッシュから除去する", () => {
    // Arrange
    const client = new QueryClient();
    seedFeed(client, "all", [post("p1", "blocked"), post("p2", "other")]);
    seedFeed(client, "training", [post("p3", "blocked")]);
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useRemoveUserPostsFromSocialFeedCache(),
      { wrapper },
    );

    // Act
    act(() => {
      result.current("blocked");
    });

    // Assert
    const all = client.getQueryData<InfiniteData<FeedPage>>(
      socialFeedQueryKey("viewer", "all"),
    );
    const training = client.getQueryData<InfiniteData<FeedPage>>(
      socialFeedQueryKey("viewer", "training"),
    );
    expect(all?.pages[0].posts.map((p) => p.id)).toEqual(["p2"]);
    expect(training?.pages[0].posts).toEqual([]);
  });
});
