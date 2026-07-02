import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { execSync } from "child_process";

const results = [];

// ① CSV を読み込む
fs.createReadStream("data.csv")
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", () => {
    const pagesDir = "pages";
    const pagefindDir = "pagefind";

    // pages フォルダが無ければ作る
    if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir);

    // ② HTML を生成する
    results.forEach((item) => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${item.title}</title>
</head>
<body>
  <h1>${item.title}</h1>
  <p>メンバー: ${item.member}</p>
  <p><a href="${item.url}">動画を見る</a></p>
</body>
</html>
      `;
      fs.writeFileSync(path.join(pagesDir, `${item.id}.html`), html);
    });

    console.log("HTML生成完了");

    // ③ Pagefind 1.x を実行してインデックス生成
    try {
      console.log("Pagefind インデックス生成中…");

      // site=現在のフォルダを指定して Pagefind を実行
      execSync("npx pagefind --site .", { stdio: "inherit" });

      console.log("Pagefind インデックス生成完了");

      // ④ pagefind フォルダが無ければ作る
      if (!fs.existsSync(pagefindDir)) fs.mkdirSync(pagefindDir);

      // ⑤ Pagefind の生成物を pagefind フォルダへコピー
      const generatedDir = "_pagefind"; // Pagefind が生成するフォルダ

      if (fs.existsSync(generatedDir)) {
        const files = fs.readdirSync(generatedDir);
        files.forEach((file) => {
          fs.copyFileSync(
            path.join(generatedDir, file),
            path.join(pagefindDir, file)
          );
        });
        console.log("pagefind フォルダへコピー完了");
      } else {
        console.log("⚠ _pagefind フォルダが見つかりませんでした");
      }
    } catch (error) {
      console.error("Pagefind 実行中にエラー:", error);
    }
  });
