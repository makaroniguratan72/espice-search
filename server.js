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

/* ===== generate.js を関数として読み込む ===== */
const generate = require("./generate.js");

/* ===== 登録API ===== */
app.post("/api/add", (req, res) => {
  const { title, member, date, video_id, description, views } = req.body;

  // CSVに追記
  const line = `"${title}","${member}","${date}","${video_id}","${description}","${views || 0}"\n`;
  fs.appendFileSync(path.join(__dirname, "data", "data.csv"), line);


  // HTML生成（generate.js の main を呼ぶ）
  generate();

  // Pagefind再生成
  execSync("npx pagefind --site site");
  execSync("cp -r site/pagefind public/pagefind");

  res.send("登録完了！検索ページに反映されました。");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
