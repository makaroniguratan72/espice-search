const fs = require('fs');
const parse = require('csv-parse/sync').parse;

const csvText = fs.readFileSync('data/data.csv', 'utf8');
const records = parse(csvText, {
  columns: true,
  skip_empty_lines: true
});

if (!fs.existsSync('site')) fs.mkdirSync('site', { recursive: true });

const memberColorClass = {
  "ネス": "nes",
  "ゾマ": "zoma",
  "とぅーし": "two",
  "凪": "nagi",
  "KOSUKE": "kosuke"
};

const tpl = r => {
  const memberList = r.members.split(';').map(m => m.trim());
  const memberFilters = memberList.map(m => `data-pagefind-filter="member:${m}"`).join(' ');
  const memberTags = memberList.map(m => `<span class="${memberColorClass[m] || ''}">${m}</span>`).join('');

  let thumbnail = "";
  const match = r.url.match(/v=([^&]+)/);
  if (match) thumbnail = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${r.title}</title>
</head>
<body>
<article class="pagefind-doc">

${r.title}
${r.title_kana}
${r.members}
${r.song}
${r.date}

  <h1>${r.title}</h1>

  <img src="${thumbnail}" class="thumb">

  <p class="title_kana">${r.title_kana}</p>

  <p class="members" ${memberFilters}>${memberTags}</p>

  <p class="song">${r.song}</p>
  <p class="date" data-date="${r.date}">${r.date}</p>

  <!-- ★ views を埋め込む（Pagefind用） -->
  <p class="views" data-pagefind-filter="views:${r.views}">
    再生回数：${r.views}
  </p>

  <a class="url" href="${r.url}">動画を見る</a>
</article>
</body>
</html>`;
};

records.forEach(r => {
  fs.writeFileSync(`site/${r.id}.html`, tpl(r), 'utf8');
});

console.log('generated', records.length);

console.log('generated', records.length);

// ★ Pagefind インデックス生成
const { execSync } = require("child_process");
console.log("Pagefind indexing...");
execSync("npx pagefind --source site", { stdio: "inherit" });
console.log("Pagefind indexing complete!");
