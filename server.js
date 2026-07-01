const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const fetch = require("node-fetch"); // ← YouTube API用

const API_KEY = process.env.YOUTUBE_API_KEY; // ← Renderの環境変数から読む

const app = express();
app.use(express.json());
app.use(express.static("public"));

// YouTube再生回数を取得する関数
async function getYoutubeViews(url) {
  try {
    const videoId = url.split("v=")[1].split("&")[0];
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${API_KEY}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.items || data.items.length === 0) return 0;

    return Number(data.items[0].statistics.viewCount);
  } catch (e) {
    console.error("YouTube API error:", e);
    return 0;
  }
}

// 作品登録API
app.post("/api/add", async (req, res) => {
  const r = req.body;

  // ① YouTube再生回数を取得
  const views = await getYoutubeViews(r.url);

  // ② CSVに views を追加して保存
  const line = `${r.id},${r.title},${r.title_kana},${r.members},${r.song},${r.date},${r.url},${views}\n`;

  fs.appendFileSync("data/data.csv", line, "utf8");

  // ③ generate.js を実行してHTMLを再生成
  exec("node generate.js", (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("generate error");
    }

    // ④ Pagefind再生成
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
