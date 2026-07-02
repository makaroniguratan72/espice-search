import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

// ★ 登録処理（CSV に追記 → generate.js 実行）
app.post("/add", async (req, res) => {
  try {
    const { id, title, member, url } = req.body;

    const newLine = `${id},${title},${member},${url}\n`;

    // CSV をローカルで書き換える
    fs.appendFileSync("./data.csv", newLine);

    // ★ HTML生成 & Pagefind再生成
    execSync("node generate.js", { stdio: "inherit" });

    res.json({ ok: true });

  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ★ index.html を返す
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/index.html"));
});

app.listen(PORT, () => {
  console.log(`ESPICE Search Web Service running on port ${PORT}`);
});
