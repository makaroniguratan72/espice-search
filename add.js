document.getElementById("videoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const url = document.getElementById("url").value;
  const date = document.getElementById("date").value;
  const members = document.getElementById("members").value;
  const description = document.getElementById("description").value;

  const newLine = `"${title}","${url}","${date}","${members}","${description}"\n`;

  const repoOwner = "makaroniguratan72";
  const repoName = "espice-search";
  const filePath = "data.csv";

  const token = window.GITHUB_TOKEN || ""; // Render が埋め込む

  if (!token) {
    document.getElementById("result").innerText = "エラー：トークンが読み込めませんでした。";
    return;
  }

  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

  try {
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const fileData = await res.json();

    const oldContent = atob(fileData.content);
    const updatedContent = oldContent + newLine;
    const encodedContent = btoa(updatedContent);

    const updateRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Add new video entry",
        content: encodedContent,
        sha: fileData.sha
      })
    });

    if (updateRes.ok) {
      document.getElementById("result").innerText = "登録完了！🎉";
    } else {
      document.getElementById("result").innerText = "エラー：更新できませんでした。";
    }

  } catch (err) {
    document.getElementById("result").innerText = "通信エラーが発生しました。";
  }
});
