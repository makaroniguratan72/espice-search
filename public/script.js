// Pagefind 検索オブジェクト
let pagefind;

// 初期化
window.addEventListener("DOMContentLoaded", async () => {
  pagefind = await new PagefindUI({
    element: "#searchResults",
    showSubResults: true,
  });

  // 初期表示：新着順で全件表示
  runSearch("");
});

// 検索実行
async function runSearch(query) {
  const results = await pagefind.search(query);
  let items = results.results.map(r => r.data);

  // メンバー絞り込み
  const checkedMembers = [...document.querySelectorAll(".member-select input:checked")]
    .map(cb => cb.value);

  if (checkedMembers.length > 0) {
    items = items.filter(item =>
      checkedMembers.some(m => item.member.includes(m))
    );
  }

  // ソート
  const sortNew = document.getElementById("sortNew").classList.contains("active");
  const sortPopular = document.getElementById("sortPopular").classList.contains("active");

  if (sortNew) {
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (sortPopular) {
    items.sort((a, b) => Number(b.views) - Number(a.views));
  }

  // 表示
  renderResults(items);
}

// 結果表示
function renderResults(items) {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "result-item";

    div.innerHTML = `
      <h3>${item.title}</h3>
      <p>出演：${item.member}</p>
      <p>再生数：${item.views}</p>
      <p>投稿日：${item.date}</p>
      <a href="pages/${item.id}.html">詳細を見る</a>
    `;

    container.appendChild(div);
  });
}

// 入力イベント
document.getElementById("searchInput").addEventListener("input", (e) => {
  runSearch(e.target.value);
});

// メンバー絞り込み
document.querySelectorAll(".member-select input").forEach(cb => {
  cb.addEventListener("change", () => runSearch(document.getElementById("searchInput").value));
});

// ソート切り替え
document.getElementById("sortNew").addEventListener("click", () => {
  document.getElementById("sortNew").classList.add("active");
  document.getElementById("sortPopular").classList.remove("active");
  runSearch(document.getElementById("searchInput").value);
});

document.getElementById("sortPopular").addEventListener("click", () => {
  document.getElementById("sortPopular").classList.add("active");
  document.getElementById("sortNew").classList.remove("active");
  runSearch(document.getElementById("searchInput").value);
});
