import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { packageTheme } from '../../tasks/package/packageTheme.js';
import { makeTmpDir, exists } from './helpers.js';

const run = promisify(execFile);

test('packageTheme: 既定の include/exclude でコピーし、--zip で zip を作る', async (t) => {
  const dir = await makeTmpDir(t);
  await fs.mkdir(path.join(dir, 'assets/css'), { recursive: true });
  await fs.writeFile(path.join(dir, 'assets/css/style.css'), 'body{}');
  await fs.writeFile(path.join(dir, 'style.css'), '/* Theme Name: t */');
  await fs.writeFile(path.join(dir, 'index.php'), '<?php');
  await fs.writeFile(
    path.join(dir, 'page-snippets.php'),
    '<?php // 除外される'
  );
  await fs.writeFile(path.join(dir, 'README.md'), '# 対象外');

  const cwd = process.cwd();
  process.chdir(dir);
  t.after(() => process.chdir(cwd));

  await packageTheme({ outputDir: 'dist/theme' }, { zip: true });

  assert.equal(
    await exists(path.join(dir, 'dist/theme/assets/css/style.css')),
    true
  );
  assert.equal(await exists(path.join(dir, 'dist/theme/index.php')), true);
  assert.equal(
    await exists(path.join(dir, 'dist/theme/page-snippets.php')),
    false,
    'exclude 既定'
  );
  assert.equal(
    await exists(path.join(dir, 'dist/theme/README.md')),
    false,
    'include 既定外'
  );

  const zipPath = path.join(dir, 'dist/theme.zip');
  assert.equal(await exists(zipPath), true);
  const head = Buffer.alloc(2);
  const fh = await fs.open(zipPath, 'r');
  await fh.read(head, 0, 2, 0);
  await fh.close();
  assert.equal(head.toString(), 'PK', 'zip のマジックナンバー');

  // unzip があれば中身も確認
  try {
    const { stdout } = await run('unzip', ['-l', zipPath]);
    assert.match(stdout, /index\.php/);
    assert.doesNotMatch(stdout, /page-snippets\.php/);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
});
