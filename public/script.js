document.addEventListener("DOMContentLoaded", async () => {
  const index = await PagefindUI.load();
  const searchInput = document.getElementById("searchInput");
  const resultsContainer = document.getElementById("searchResults");

  // メンバー全員 ON
  const memberChecks = document.querySelectorAll(".member-option input");
  memberChecks.forEach(cb => cb.checked = true);

  // 初期表示：空欄検索 → 全動画表示
  const initialResults = await index.search("");
  renderResults(initialResults.results);

  // 検索イベント
  searchInput.addEventListener("input", async () => {
    const query = searchInput.value;
    const results = await index.search(query);
    renderResults(results.results);
  });

  // メンバー絞り込み
  memberChecks.forEach(cb => {
    cb.addEventListener("change", async () => {
      const query = searchInput.value;
      const results = await index.search(query);
      renderResults(results.results);
    });
  });

  // 新着順
  document.getElementById("sortNew").addEventListener("click", async () => {
    const results = await index.search(searchInput.value);
    const sorted = results.results.sort((a, b) => b.meta.date.localeCompare(a.meta.date));
    renderResults(sorted);
  });

  // 人気順（YouTube viewCount）
  document.getElementById("sortPopular").addEventListener("click", async () => {
    const results = await index.search(searchInput.value);
    const sorted = results.results.sort((a, b) => b.meta.views - a.meta.views);
    renderResults(sorted);
  });

});

// 結果描画
function renderResults(results) {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  const selectedMembers = [...document.querySelectorAll(".member-option input:checked")].map(cb => cb.value);

  results.forEach(r => {
    if (!selectedMembers.includes(r.meta.member)) return;

    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="${r.meta.thumbnail}" class="thumb">
      <div class="info">
        <h3>${r.meta.title}</h3>
        <p>${r.meta.member}</p>
      </div>
    `;
    container.appendChild(card);
  });
}
