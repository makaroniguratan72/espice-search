const express = require("express");
const path = require("path");
const fs = require("fs");
const { parse } = require("csv-parse");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/site", express.static(path.join(__dirname, "site")));

/* ====== 登録API ====== */
app.post("/api/add", (req, res) => {
  const { title, member, date, video_id, description } = req.body;

  const line = `"${title}","${member}","${date}","${video_id}","${description}"\n`;

  fs.appendFileSync("data.csv", line);

  // HTML生成
  require("./generate.js")();

  // Pagefind再生成
  const { execSync } = require("child_process");
  execSync("npx pagefind --site site");
  execSync("cp -r site/pagefind public/pagefind");

  res.send("登録完了！検索ページに反映されました。");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
