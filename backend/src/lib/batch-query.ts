/**
 * Supabase の .in() クエリをバッチに分割して実行するユーティリティ。
 * PostgreSQL のバインドパラメータ上限（約 32,767）を回避するため、
 * 大きな ID 配列を BATCH_SIZE 件ずつ分割して処理する。
 */
const BATCH_SIZE = 500;

export async function batchIn<T>(
  queryFn: (ids: string[]) => Promise<T[]>,
  allIds: string[],
): Promise<T[]> {
  if (allIds.length <= BATCH_SIZE) {
    return queryFn(allIds);
  }

  const results: T[] = [];
  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    const batch = allIds.slice(i, i + BATCH_SIZE);
    const batchResults = await queryFn(batch);
    results.push(...batchResults);
  }
  return results;
}
