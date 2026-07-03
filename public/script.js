let pagefind;

document.addEventListener("DOMContentLoaded", async () => {
  // Pagefind 2.x を初期化
  pagefind = await Pagefind.create();

  // イベント設定
  document.getElementById("searchInput").addEventListener("input", applyFilters);

  document.querySelectorAll(".member-select input").forEach(cb => {
    cb.addEventListener("change", applyFilters);
  });

  document.getElementById("sortNew").addEventListener("click", () => {
    activateTab("sortNew");
    applyFilters();
  });

  document.getElementById("sortPopular").addEventListener("click", () => {
    activateTab("sortPopular");
    applyFilters();
  });

  // 初期表示
  applyFilters();
});

// タブ切り替え
function activateTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// フィルタ適用
async function applyFilters() {
  const keyword = document.getElementById("searchInput").value.trim();
  const members = [...document.querySelectorAll(".member-select input:checked")].map(cb => cb.value);

  let results = [];

  // Pagefind 2.x の検索
  const search = await pagefind.search(keyword);
  results = await Promise.all(search.results.map(r => r.data()));

  // メンバー絞り込み
  if (members.length > 0) {
    results = results.filter(r => members.some(m => r.meta.member.includes(m)));
  }

  // ソート
  const mode = document.querySelector(".tab.active").id;
  if (mode === "sortNew") {
    results.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
  } else {
    results.sort((a, b) => Number(b.meta.views) - Number(a.meta.views));
  }

  renderResults(results);
}

// 結果表示
function renderResults(results) {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  results.forEach(r => {
    container.innerHTML += `
      <div class="video-card">
        <h3>${r.meta.title}</h3>
        <p>出演：${r.meta.member}</p>
        <p>再生数：${r.meta.views}</p>
        <p>投稿日：${r.meta.date}</p>
        <a href="pages/${r.meta.id}.html">詳細ページへ</a>
      </div>
    `;
  });
}
