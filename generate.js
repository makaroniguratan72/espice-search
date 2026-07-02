import fs from "fs";
import path from "path";
import csv from "csv-parser";

const results = [];

fs.createReadStream("data.csv")
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", () => {
    const pagesDir = "pages";
    if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir);

    results.forEach((item) => {
      const html = `
        <html>
          <head><meta charset="UTF-8"></head>
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
  });
