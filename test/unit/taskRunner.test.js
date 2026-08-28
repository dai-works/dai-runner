import { test } from 'node:test';
import assert from 'node:assert/strict';
import TaskRunner from '../../utils/TaskRunner.js';

test('並列タスクは全完了後に全失敗メッセージをまとめてrejectする', async () => {
  await assert.rejects(
    TaskRunner.runParallelTasks([
      Promise.reject(new Error('一つ目の失敗')),
      new Promise((resolve) => setTimeout(() => resolve('完了'), 10)),
      Promise.reject(new Error('二つ目の失敗')),
    ]),
    (error) =>
      error.message.includes('一つ目の失敗') &&
      error.message.includes('二つ目の失敗')
  );
});
