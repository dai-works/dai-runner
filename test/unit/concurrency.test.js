import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapWithConcurrency } from '../../utils/concurrency.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('mapWithConcurrency: 同時実行数を超えず、結果は入力順', async () => {
  let running = 0;
  let peak = 0;
  const items = [30, 5, 20, 1, 15, 10, 2, 8];
  const results = await mapWithConcurrency(items, 3, async (ms, index) => {
    running++;
    peak = Math.max(peak, running);
    await sleep(ms);
    running--;
    return `${index}:${ms}`;
  });
  assert.equal(peak, 3);
  assert.deepEqual(
    results,
    items.map((ms, index) => `${index}:${ms}`)
  );
});

test('mapWithConcurrency: limit が 1 なら逐次、失敗は伝播する', async () => {
  const order = [];
  await mapWithConcurrency([1, 2, 3], 1, async (n) => {
    order.push(`start${n}`);
    await sleep(2);
    order.push(`end${n}`);
  });
  assert.deepEqual(order, [
    'start1',
    'end1',
    'start2',
    'end2',
    'start3',
    'end3',
  ]);

  await assert.rejects(
    mapWithConcurrency([1, 2], 2, async (n) => {
      if (n === 2) throw new Error('boom');
    }),
    /boom/
  );
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), []);
});
