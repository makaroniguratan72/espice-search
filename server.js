import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// ★ public を配信（これが最重要）
app.use(express.static(path.join(__dirname, "public")));

// ★ pagefind と pages も public 内を配信する
app.use("/pagefind", express.static(path.join(__dirname, "public/pagefind")));
app.use("/pages", express.static(path.join(__dirname, "public/pages")));

// SPA のための index.html 配信
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const OWNER = "makaroniguratan72";
const REPO = "espice-search";
const FILE_PATH = "data.csv";
const TOKEN = process.env.GITHUB_TOKEN;

// CSV 追記 API
app.post("/add", async (req, res) => {
  try {
    const { title, url, date, members, description } = req.body;

    const newLine = `"${title}","${url}","${date}","${members}","${description}"\n`;

    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

    const getRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const fileData = await getRes.json();

    const oldContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    const updatedContent = oldContent + newLine;
    const encodedContent = Buffer.from(updatedContent).toString("base64");

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

    if (putRes.ok) {
      res.json({ ok: true });
    } else {
      res.json({ ok: false, error: "GitHub update failed" });
    }

  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log("ESPICE Search Web Service running on port 3000");
});
