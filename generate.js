const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { execSync } = require("child_process");

/* ====== メンバー色クラス ====== */
function memberColorClass(member) {
  switch (member) {
    case "ネス": return "color-nes";
    case "ゾマやかじゃない！": return "color-zoma";
    case "とぅーし": return "color-tushi";
    case "凪": return "color-nagi";
    case "KOSUKE": return "color-kosuke";
    default: return "color-default";
  }
}

/* ====== HTMLテンプレート ====== */
function generateHTML(data) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${data.title}</title>

<style>
.thumb {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 14px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.12);
}
h2 {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #000;
}
.meta {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}
.member {
  font-weight: bold;
  margin-right: 10px;
}
.date {
  opacity: 0.8;
}
.desc {
  font-size: 14px;
  color: #444;
  line-height: 1.7;
}
.card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 6px 14px rgba(0,0,0,0.15);
  border-left: 6px solid #ff4b4b;
}
.color-nes { border-left-color: #888; }
.color-zoma { border-left-color: #ff8c00; }
.color-tushi { border-left-color: #4fc3f7; }
.color-nagi { border-left-color: #9acd32; }
.color-kosuke { border-left-color: #9370db; }
</style>

</head>
<body>

<div class="card ${data.member_class}"
     data-pagefind-filter="member:${data.member}"
     data-pagefind-sort="date:${data.date},views:${data.views}">

  <img src="https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg" class="thumb">

  <h2>${data.title}</h2>

  <div class="meta">
    <span class="member">${data.member}</span>
    <span class="date">${data.date}</span>
  </div>

  <p class="desc">${data.description}</p>
</div>

</body>
</html>
`;
}

/* ====== メイン処理 ====== */
function main() {
  console.log("📄 CSV を読み込み中…");

  const csvText = fs.readFileSync(path.join(__dirname, "data", "data.csv"), "utf-8");
  const records = parse(csvText, {
    columns: ["title", "member", "date", "video_id", "description", "views"],
    skip_empty_lines: true
  });

  console.log("📁 site フォルダを初期化中…");

  // site を完全に消す（1回だけ）
  fs.rmSync(path.join(__dirname, "site"), { recursive: true, force: true });

  // site を作り直す（1回だけ）
  fs.mkdirSync(path.join(__dirname, "site"));

  console.log("📝 HTML を生成中…");

  records.forEach((row, i) => {
    const data = {
      title: row.title,
      member: row.member,
      date: row.date,
      video_id: row.video_id,
      description: row.description,
      views: row.views || 0,
      member_class: memberColorClass(row.member)
    };

    const html = generateHTML(data);
    fs.writeFileSync(path.join(__dirname, "site", `${String(i + 1).padStart(3, "0")}.html`), html, "utf-8");
  });

  console.log("🔍 Pagefind を生成中…");
  execSync("npx pagefind --site site");

  console.log("📦 public/pagefind を更新中…");

  const srcDir = path.join(__dirname, "site", "pagefind");
  const destDir = path.join(__dirname, "public", "pagefind");

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  fs.readdirSync(srcDir).forEach(file => {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  });

  console.log("✅ 完了！検索ページに反映されました！");
}

module.exports = main;
