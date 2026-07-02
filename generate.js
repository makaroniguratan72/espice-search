import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CSV_PATH = "./data.csv";
const PAGES_DIR = "./public/pages";

// HTMLテンプレート（マッキーのCSV用）
function createHTML(id, title, members, url) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body>
  <h1>${title}</h1>
  <p>URL: <a href="${url}" target="_blank">${url}</a></p>
  <p>メンバー: ${members}</p>
</body>
</html>
`;
}

function generatePages() {
  const csv = fs.readFileSync(CSV_PATH, "utf-8").trim();
  const lines = csv.split("\n").slice(1); // ヘッダー除外

  if (!fs.existsSync(PAGES_DIR)) {
    fs.mkdirSync(PAGES_DIR, { recursive: true });
  }

  for (const line of lines) {
    const cols = line.split(",");

    const id = cols[0];
    const title = cols[1];
    const members = cols[2];
    const url = cols[3];

    const html = createHTML(id, title, members, url);

    fs.writeFileSync(`${PAGES_DIR}/${id}.html`, html);
  }

  console.log("✔ HTML生成完了");
}

function generatePagefind() {
  console.log("✔ Pagefind再生成中…");
  execSync(`npx pagefind --source public`, { stdio: "inherit" });
  console.log("✔ Pagefind再生成完了");
}

function main() {
  generatePages();
  generatePagefind();
}

main();
