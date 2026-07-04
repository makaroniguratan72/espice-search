import fs from "fs";
import path from "path";
import csv from "csv-parser";

const csvPath = path.join("data", "videos.csv");

// ★ 出力先を public/pagefind に変更
const outputPath = path.join("public", "pagefind", "pagefind-entry.json");

const results = [];

fs.createReadStream(csvPath)
  .pipe(csv())
  .on("data", (row) => {
    const youtubeId = row.youtubeId || "";

    // ★ YouTubeサムネ自動生成
    const thumbnail = youtubeId
      ? `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
      : "";

    results.push({
      id: Number(row.id || 0),
      title: row.title || "",
      members: row.members ? row.members.split(",") : [],
      youtubeId,
      url: row.url || "",
      views: Number(row.views || 0),
      date: row.date || "",
      description: row.description || "",
      thumbnail,
    });
  })
  .on("end", () => {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");
    console.log("JSON 生成完了！サムネも自動で入りました！");
  });
