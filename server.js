import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

// ★ GitHub リポジトリ情報（マッキー専用）
const OWNER = "makaroniguratan72";
const REPO = "espice-search";
const FILE_PATH = "data.csv";
const TOKEN = process.env.GITHUB_TOKEN; // ← Render の環境変数に入れる

// ★ 登録処理（GitHub の CSV を書き換える）
app.post("/add", async (req, res) => {
  try {
    const { id, title, member, url } = req.body;

    const newLine = `${id},${title},${member},${url}\n`;

    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

    // ① GitHub から data.csv を取得
    const getRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const fileData = await getRes.json();

    const oldContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    const updatedContent = oldContent + newLine;
    const encodedContent = Buffer.from(updatedContent).toString("base64");

    // ② GitHub に PUT して CSV を更新
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Add new video entry",
        content: encodedContent,
        sha: fileData.sha
      })
    });

    if (!putRes.ok) {
      return res.json({ ok: false, error: "GitHub update failed" });
    }

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
