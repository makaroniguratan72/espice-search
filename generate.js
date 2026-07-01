const fs = require('fs');
const parse = require('csv-parse/sync').parse;

// CSV を UTF-8 として読み込む
const csvText = fs.readFileSync('data.csv', 'utf8');
const records = parse(csvText, {
  columns: true,
  skip_empty_lines: true
});

// site フォルダが無ければ作る
if (!fs.existsSync('site')) fs.mkdirSync('site', { recursive: true });

// メンバー色クラス対応表（ESPICE公式カラー）
const memberColorClass = {
  "ネス": "nes",
  "ゾマ": "zoma",
  "とぅーし": "two",
  "凪": "nagi",
  "KOSUKE": "kosuke"
};

// HTML テンプレート
const tpl = r => {

  // メンバーを ; で分割
  const memberList = r.members.split(';').map(m => m.trim());

  // Pagefind フィルタ属性
  const memberFilters = memberList
    .map(m => `data-pagefind-filter="member:${m}"`)
    .join(' ');

  // 色タグ生成
  const memberTags = memberList
    .map(m => `<span class="${memberColorClass[m] || ''}">${m}</span>`)
    .join('');

  // YouTube サムネイル生成
  let thumbnail = "";
  const match = r.url.match(/v=([^&]+)/);
  if (match) {
    const videoId = match[1];
    thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

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

  <img src="${thumbnail}" alt="thumbnail" class="thumb">

  <p class="title_kana">${r.title_kana}</p>

  <p class="members" ${memberFilters}>${memberTags}</p>

  <p class="song">${r.song}</p>
  <p class="date" data-date="${r.date}">${r.date}</p>

  <a class="url" href="${r.url}">動画を見る</a>
</article>
</body>
</html>`;
};

// HTML を生成
records.forEach(r => {
  fs.writeFileSync(`site/${r.id}.html`, tpl(r), 'utf8');
});

console.log('generated', records.length);
