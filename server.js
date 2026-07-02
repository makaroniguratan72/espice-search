import { execSync } from "child_process";

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

    if (!putRes.ok) {
      return res.json({ ok: false, error: "GitHub update failed" });
    }

    // ★ CSV更新後に generate.js を実行
    execSync("node generate.js", { stdio: "inherit" });

    res.json({ ok: true });

  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});
