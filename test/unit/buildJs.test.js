import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildJs } from '../../tasks/js/buildJs.js';
import { makeTmpDir } from './helpers.js';

test('buildJsの非バンドル経路はコピーと圧縮を切り替える', async (t) => {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'src');
  const copyDist = path.join(dir, 'copy');
  const minDist = path.join(dir, 'min');
  const source =
    'const greeting = "hello";\nconsole.log(greeting);\nwindow.greeting = greeting;\n';
  await fs.mkdir(src, { recursive: true });
  await fs.writeFile(path.join(src, 'main.js'), source);

  await buildJs({
    paths: { src, dist: copyDist },
    options: { bundle: false, minify: false },
  });
  assert.equal(
    await fs.readFile(path.join(copyDist, 'main.js'), 'utf8'),
    source
  );

  await buildJs({
    paths: { src, dist: minDist },
    options: {
      bundle: false,
      minify: true,
      dropConsole: true,
    },
  });
  const minified = await fs.readFile(path.join(minDist, 'main.js'), 'utf8');
  assert.ok(minified.split('\n').length <= 2);
  assert.doesNotMatch(minified, /console\./);
});
