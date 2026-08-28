import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import Logger from '../../utils/Logger.js';

export async function initScss(srcDir) {
  try {
    Logger.log('INFO', '_index.scssの作成を開始します...');

    // 全てのサブディレクトリを再帰的に検索
    const directories = await glob('**/', {
      cwd: srcDir,
      ignore: ['node_modules/**'],
      dot: false,
    });

    // 各ディレクトリに_index.scssを作成（ルート直下は除外）
    for (const dir of directories) {
      const dirPath = path.join(srcDir, dir);
      const indexPath = path.join(dirPath, '_index.scss');

      // ルート直下（source/scss/）の_index.scssは生成しない
      const isRootDir = path.resolve(dirPath) === path.resolve(srcDir);
      if (isRootDir) {
        continue;
      }

      // ディレクトリ内の他のSCSSファイルを検索（_index.scss以外）
      const scssFiles = await glob('*.scss', {
        cwd: dirPath,
        ignore: ['_index.scss'],
      });

      // @forwardディレクティブを生成（先頭行は「このスクリプトの生成物」の目印）
      const header = `// ${path.basename(dir)} styles\n`;
      let indexContent = header;

      for (const file of scssFiles) {
        // ファイル名から拡張子を除去
        const moduleName = file.replace('.scss', '');
        // _で始まるファイルは既にパーシャルなので、そのまま@forward
        // _で始まらないファイルは、.を付けて相対パスとして@forward
        const importPath = moduleName.startsWith('_')
          ? moduleName.slice(1) // 先頭の_を削除
          : './' + moduleName; // 相対パスを追加

        indexContent += `\n@forward "${importPath}";`;
      }

      // 最後に必ず1つの改行を追加
      indexContent += '\n';

      // 既存ファイルの扱い：
      // - 無い → 作成
      // - 生成ヘッダで始まる（＝過去にここで生成したもの）→ 内容が変わった時だけ書き直す
      // - それ以外（手書き）→ 触らない。@forward ... with (...) や並べ替えを壊さないため
      const relIndexPath = path.relative(process.cwd(), indexPath);
      const existing = await fs.readFile(indexPath, 'utf8').catch(() => null);
      if (existing === null) {
        await fs.writeFile(indexPath, indexContent);
        Logger.log('INFO', `_index.scssを作成しました: ${relIndexPath}`);
      } else if (!existing.startsWith(header)) {
        Logger.log(
          'WARN',
          `_index.scssが手書きのため更新しません（自動生成に戻すには先頭行を「${header.trim()}」にしてください）: ${relIndexPath}`
        );
      } else if (existing !== indexContent) {
        await fs.writeFile(indexPath, indexContent);
        Logger.log('INFO', `_index.scssを更新しました: ${relIndexPath}`);
      }
    }

    Logger.log('SUCCESS', '_index.scssの作成が完了しました');
  } catch (err) {
    Logger.log('ERROR', '_index.scssの作成に失敗しました:', err);
    throw err;
  }
}
