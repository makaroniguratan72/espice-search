const fs = require("fs");
const csv = require("csv-parser");

// ▼ public/pages が無かったら自動で作る
if (!fs.existsSync("public/pages")) {
  fs.mkdirSync("public/pages", { recursive: true });
  console.log("public/pages フォルダを作成しました");
}

// ▼ CSV 読み込み
fs.createReadStream("data.csv")
  .pipe(csv())
  .on("data", (row) => {
    console.log("ROW:", row); // ← CSV が読めてるか確認

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${row.title} - ESPICE 踊ってみた動画</title>

  <meta name="title" content="${row.title}">
  <meta name="member" content="${row.member}">
  <meta name="date" content="${row.date}">
  <meta name="views" content="${row.views}">
  <meta name="id" content="${row.id}">
  <meta name="thumbnail" content="${row.thumbnail}">

  <link rel="stylesheet" href="../style.css">
</head>

<body>
  <div class="video-page">
    <h1>${row.title}</h1>
    <p class="member">出演：${row.member}</p>

    <div class="video-frame">
      <iframe width="560" height="315"
        src="${row.url}"
        frameborder="0"
        allowfullscreen>
      </iframe>
    </div>

    <div class="video-info">
      <p><strong>再生数：</strong> ${row.views} 回</p>
      <p><strong>投稿日：</strong> ${row.date}</p>
    </div>

    <div class="description">
      <h2>動画説明</h2>
      <p>${row.description}</p>
    </div>

    <p><a href="${row.url}" target="_blank">YouTubeで見る</a></p>
    <p><a href="../index.html">← 検索ページに戻る</a></p>
  </div>
</body>
</html>
`;

    try {
      fs.writeFileSync(`public/pages/${row.id}.html`, html);
      console.log(`✔ 作成: public/pages/${row.id}.html`);
    } catch (err) {
      console.error(`✖ 書き込み失敗: ${row.id}`, err);
    }
  })
  .on("end", () => {
    console.log("CSV 読み込み完了！");
  });
