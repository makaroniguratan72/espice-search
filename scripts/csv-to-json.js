// scripts/csv-to-json.js
const fs = require('fs');
const path = require('path');

// ★ 正しい CSV の場所に修正
const csvPath = path.join(__dirname, '..', 'data', 'videos.csv');

// ★ 出力先はそのままでOK
const jsonPath = path.join(__dirname, '..', 'public', 'pagefind', 'pagefind-entry.json');

// ★ Shift-JIS → UTF-8 対応（文字化け対策）
function readCsvUtf8(filePath) {
  const buffer = fs.readFileSync(filePath);
  // 自動判定は難しいので、UTF-8 として読む（必要なら iconv-lite を使う）
  return buffer.toString('utf8');
}

function csvToJson() {
  const csv = readCsvUtf8(csvPath);
  const lines = csv.trim().split('\n');
  const header = parseHeader(lines[0]);

  const records = lines.slice(1).map(line => {
    const cols = parseCsvLine(line);
    const obj = {};
    header.forEach((key, i) => {
      obj[key] = cols[i] ? cols[i].trim() : '';
    });

    // members を配列化
    const members = obj.member
      ? obj.member.split(';').map(m => m.trim()).filter(Boolean)
      : [];

    return {
      id: obj.id ? Number(obj.id) : null,
      title: obj.title || '',
      members,
      youtubeId: obj.youtubeId || '',
      url: obj.url || '',
      views: obj.views ? Number(obj.views) : 0,
      date: obj.date || '',
      description: obj.description || '',
      thumbnail: obj.thumbnail || ''
    };
  });

  // ★ fallback検索用に配列ルートで出力（このままでOK）
  fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2), 'utf8');
  console.log(`JSON written to ${jsonPath}`);
}

function parseHeader(line) {
  return line.split(',').map(h => h.trim());
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

csvToJson();
