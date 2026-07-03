document.addEventListener("DOMContentLoaded", async () => {
  const pagefind = await new PagefindUI({
    element: "#searchResults",
    showImages: false,
    showSubResults: false,
  });

  // 初期表示（新着順）
  loadInitialVideos();

  // 新着順
  document.getElementById("sortNew").addEventListener("click", () => {
    loadInitialVideos("new");
  });

  // 人気順
  document.getElementById("sortPopular").addEventListener("click", () => {
    loadInitialVideos("popular");
  });

  // メンバー絞り込み
  const memberCheckboxes = document.querySelectorAll(".member-option input");
  memberCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      applyFilters();
    });
  });

  // 検索バー
  document.getElementById("searchInput").addEventListener("input", applyFilters);
});


// ===============================
// 初期表示
// ===============================
async function loadInitialVideos(sort = "new") {
  const res = await fetch("/pagefind/search.json");
  const data = await res.json();

  let results = data.results;

  if (sort === "new") {
    results.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
  } else {
    results.sort((a, b) => Number(b.meta.views) - Number(a.meta.views));
  }

  renderResults(results);
}


// ===============================
// 絞り込み
// ===============================
async function applyFilters() {
  const keyword = document.getElementById("searchInput").value.trim();
  const memberFilters = [...document.querySelectorAll(".member-option input:checked")].map(cb => cb.value);

  const res = await fetch("/pagefind/search.json");
  const data = await res.json();

  let results = data.results;

  if (keyword) {
    results = results.filter(r => r.meta.title.includes(keyword));
  }

  if (memberFilters.length > 0) {
    results = results.filter(r => memberFilters.some(m => r.meta.member.includes(m)));
  }

  renderResults(results);
}


// ===============================
// 表示
// ===============================
function renderResults(results) {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  results.forEach(r => {
    const html = `
      <div class="video-card">
        <h3>${r.meta.title}</h3>
        <p>出演：${r.meta.member}</p>
        <p>再生数：${r.meta.views}</p>
        <p>投稿日：${r.meta.date}</p>
        <a href="pages/${r.meta.id}.html">詳細ページへ</a>
      </div>
    `;
    container.innerHTML += html;
  });
}
