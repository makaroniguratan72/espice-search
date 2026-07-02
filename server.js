import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import { execSync } from "child_process";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

const OWNER = "makaroniguratan72";
const REPO = "espice-search";
const FILE_PATH = "data.csv";
const TOKEN = process.env.GITHUB_TOKEN;

// GitHub API base
const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

app.post("/add", async (req, res) => {
  try {
    const { id, title, member, url } = req.body;
    const newLine = `${id},${title},${member},${url}\n`;

    // ① CSV を取得
    const getRes = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    const oldContent = Buffer.from(getRes.data.content, "base64").toString("utf-8");
    const updatedContent = oldContent + newLine;
    const encodedContent = Buffer.from(updatedContent).toString("base64");

    // ② CSV を更新
    await axios.put(
      apiUrl,
      {
        message: "Add new video entry",
        content: encodedContent,
        sha: getRes.data.sha
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ ok: true });

  } catch (err) {
    console.log("GitHub update error:", err.response?.data || err.message);
    res.json({ ok: false, error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/index.html"));
});

app.listen(PORT, () => {
  console.log(`ESPICE Search Web Service running on port ${PORT}`);
});
