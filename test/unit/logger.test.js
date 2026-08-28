import { test } from 'node:test';
import assert from 'node:assert/strict';
import Logger from '../../utils/Logger.js';

function captureLogs(t) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...messages) => logs.push(messages.join(' '));
  console.error = (...messages) => errors.push(messages.join(' '));
  t.after(() => {
    console.log = originalLog;
    console.error = originalError;
  });
  return { logs, errors };
}

test('Errorを渡したログはスタックトレースを出力する', (t) => {
  const { errors } = captureLogs(t);
  const error = new Error('テストエラー');
  Logger.setLogLevel('info');
  Logger.log('ERROR', 'エラー:', error);
  // 文字列化（String(err)）でも 'Error: メッセージ' は出るので、スタックフレーム行まで確認する
  assert.match(errors.join('\n'), /Error: テストエラー\n\s+at /);
});

test('errorレベルではSUCCESSを出力しない', (t) => {
  const { logs } = captureLogs(t);
  Logger.setLogLevel('error');
  Logger.log('SUCCESS', '成功');
  assert.equal(logs.length, 0);
});

test('infoレベルではSUCCESSを出力する', (t) => {
  const { logs } = captureLogs(t);
  Logger.setLogLevel('info');
  Logger.log('SUCCESS', '成功');
  assert.match(logs.join('\n'), /成功/);
});
