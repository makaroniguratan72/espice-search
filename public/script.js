document.addEventListener("DOMContentLoaded", async () => {
  loadVideos("new");

  document.getElementById("sortNew").addEventListener("click", () => {
    activateTab("sortNew");
    loadVideos("new");
  });

  document.getElementById("sortPopular").addEventListener("click", () => {
    activateTab("sortPopular");
    loadVideos("popular");
  });

  document.getElementById("searchInput").addEventListener("input", applyFilters);

  document.querySelectorAll(".member-select input").forEach(cb => {
    cb.addEventListener("change", applyFilters);
  });
});

/* タブ切り替え */
function activateTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* 初期表示・並び替え */
async function loadVideos(mode) {
  const res = await fetch("pagefind/pagefind-entry.json");
  const data = await res.json();
  let results = data.results;

  if (mode === "new") {
    results.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
  } else {
    results.sort((a, b) => Number(b.meta.views) - Number(a.meta.views));
  }

  renderResults(results);
}

/* 絞り込み */
async function applyFilters() {
  const keyword = document.getElementById("searchInput").value.trim();
  const members = [...document.querySelectorAll(".member-select input:checked")].map(cb => cb.value);

  const res = await fetch("pagefind/search.json");
  const data = await res.json();
  let results = data.results;

  if (keyword) {
    results = results.filter(r => r.meta.title.includes(keyword));
  }

  if (members.length > 0) {
    results = results.filter(r => members.some(m => r.meta.member.includes(m)));
  }

  renderResults(results);
}

/* カード表示 */
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
