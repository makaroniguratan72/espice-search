const fs = require("fs");
const path = require("path");

// ===============================
// テンプレ
// ===============================
const template = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>{{title}} - ESPICE 踊ってみた動画</title>
  <link rel="stylesheet" href="../style.css">
</head>

<body>

  <div class="video-page">

    <h1>{{title}}</h1>
    <p class="member">出演：{{member}}</p>

    <div class="video-frame">
      <iframe width="560" height="315"
        src="https://www.youtube.com/embed/{{youtubeId}}"
        frameborder="0"
        allowfullscreen>
      </iframe>
    </div>

    <div class="video-info">
      <p><strong>再生数：</strong> {{views}} 回</p>
      <p><strong>投稿日：</strong> {{date}}</p>
    </div>

    <div class="description">
      <h2>動画説明</h2>
      <p>{{description}}</p>
    </div>

    <p>
      <a href="{{url}}" target="_blank">YouTubeで見る</a>
    </p>

    <p>
      <a href="../index.html">← 検索ページに戻る</a>
    </p>

  </div>

</body>
</html>
`;


// ===============================
// CSV 読み込み
// ===============================
function loadCSV() {
  const csv = fs.readFileSync("data.csv", "utf8").trim();
  const lines = csv.split("\n");
  const header = lines[0].split(",");

  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const obj = {};
    header.forEach((h, i) => obj[h] = cols[i] || "");
    return obj;
  });
}


// ===============================
// HTML 生成（pages/ に出力）
// ===============================
function generatePages(data) {
  data.forEach(row => {
    let html = template
      .replace(/{{title}}/g, row.title)
      .replace(/{{member}}/g, row.member)
      .replace(/{{youtubeId}}/g, row.youtubeId)
      .replace(/{{views}}/g, row.views)
      .replace(/{{date}}/g, row.date)
      .replace(/{{description}}/g, row.description)
      .replace(/{{url}}/g, row.url);

    const filePath = path.join("public/pages", `${row.id}.html`);
    fs.writeFileSync(filePath, html, "utf8");
    console.log(`✔ pages/${row.id}.html を生成したで`);
  });
}


// ===============================
// main
// ===============================
function main() {
  const data = loadCSV();
  generatePages(data);
}

if (require.main === module) {
  main();
}
