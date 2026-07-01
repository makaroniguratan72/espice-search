const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// 作品登録API
app.post("/api/add", (req, res) => {
  const r = req.body;

  const line = `${r.id},${r.title},${r.title_kana},${r.members},${r.song},${r.date},${r.url}\n`;

  fs.appendFileSync("data/data.csv", line, "utf8");

  // generate.js を実行してHTMLを再生成
  exec("node generate.js", (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("generate error");
    }

    // Pagefind再生成
    exec("npx pagefind --site site", (err2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send("pagefind error");
      }
      res.send("ok");
    });
  });
});

app.listen(3000, () => {
  console.log("server running on port 3000");
});
