/**
 * 配列の各要素に非同期処理を適用する。同時に走る処理数を limit 以下に抑える
 * （sharp のような CPU 負荷の高い処理を、コア数を超えない範囲で並列にするため）。
 * 結果は items と同じ順序で返す。いずれかが reject したら全体も reject する。
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit - 同時実行数（1 以上。1 なら逐次）
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, worker) {
  const size = Math.max(1, Math.floor(Number(limit) || 1));
  const results = new Array(items.length);
  let next = 0;

  async function runner() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }

  const runners = Array.from({ length: Math.min(size, items.length) }, () =>
    runner()
  );
  await Promise.all(runners);
  return results;
}
