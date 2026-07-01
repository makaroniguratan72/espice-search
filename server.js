const express = require("express");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/site", express.static(path.join(__dirname, "site")));

const generate = require("./generate.js");

app.post("/api/add", (req, res) => {
  const { title, member, date, video_id, description, views } = req.body;

  const line = `"${title}","${member}","${date}","${video_id}","${description}","${views || 0}"\n`;
  fs.appendFileSync(path.join(__dirname, "data", "data.csv"), line);

  // HTML生成
  generate();

  // Pagefind再生成
  execSync("npx pagefind --site site");

  // public/pagefind を正しくコピー
  const srcDir = path.join(__dirname, "site", "pagefind");
  const destDir = path.join(__dirname, "public", "pagefind");

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  fs.readdirSync(srcDir).forEach(file => {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  });

  res.send("登録完了！検索ページに反映されました。");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
