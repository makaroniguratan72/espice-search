// script.js
// Pagefind が初期化されるまで待つユーティリティ
function waitForPagefind(timeout = 7000) {
  return new Promise((resolve, reject) => {
    if (window.pagefind) {
      resolve(window.pagefind);
      return;
    }
    const interval = 50;
    let waited = 0;
    const t = setInterval(() => {
      if (window.pagefind) {
        clearInterval(t);
        resolve(window.pagefind);
      } else {
        waited += interval;
        if (waited >= timeout) {
          clearInterval(t);
          reject(new Error('pagefind not available after timeout'));
        }
      }
    }, interval);
  });
}

(async () => {
  try {
    // Pagefind の準備を待つ
    await waitForPagefind(7000);
    console.log('pagefind ready', window.pagefind);

    const pagefind = window.pagefind;

    // 検索を実行する関数
    async function runSearch(query) {
      if (!pagefind || typeof pagefind.search !== 'function') {
        console.error('pagefind.search is not available yet');
        return [];
      }

      // Pagefind の search API を呼ぶ（API によって戻り値の形が違うので安全に扱う）
      const raw = await pagefind.search(query || '');
      const resultsArray = (raw && raw.results) ? raw.results : (Array.isArray(raw) ? raw : []);
      let items = resultsArray.map(r => r.data || r);

      // メンバー絞り込み
      const checkedMembers = [...document.querySelectorAll(".member-select input:checked")]
        .map(cb => cb.value);

      if (checkedMembers.length > 0) {
        items = items.filter(item => {
          const memberField = item.member || item.members || item.cast || '';
          if (!memberField) return false;
          return checkedMembers.some(m => String(memberField).includes(m));
        });
      }

      // ソート
      const sortNew = document.getElementById("sortNew").classList.contains("active");
      const sortPopular = document.getElementById("sortPopular").classList.contains("active");

      if (sortNew) {
        items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      } else if (sortPopular) {
        items.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
      }

      renderResults(items);
      return items;
    }

    // 結果を描画する関数
    function renderResults(items) {
      const container = document.getElementById("searchResults");
      container.innerHTML = "";

      if (!items || items.length === 0) {
        container.innerHTML = '<div class="no-results">該当する動画が見つかりませんでした。</div>';
        return;
      }

      items.forEach(item => {
        const div = document.createElement("article");
        div.className = "result-item";

        const title = item.title || item.name || 'タイトルなし';
        const member = item.member || item.members || item.cast || '不明';
        const views = item.views || item.view || 0;
        const date = item.date || item.published || '';

        const link = item.id ? `pages/${item.id}.html` : (item.url || '#');

        div.innerHTML = `
          <h3 class="result-title"><a href="${link}">${escapeHtml(title)}</a></h3>
          <div class="result-meta">
            <span class="meta-member">出演：${escapeHtml(member)}</span>
            <span class="meta-views">再生数：${escapeHtml(String(views))}</span>
            <span class="meta-date">投稿日：${escapeHtml(date)}</span>
          </div>
          <p class="result-excerpt">${escapeHtml(item.excerpt || item.summary || '')}</p>
        `;
        container.appendChild(div);
      });
    }

    // HTML エスケープ（簡易）
    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      })[c]);
    }

    // イベント登録
    const input = document.getElementById("searchInput");
    input.addEventListener("input", debounce(async (e) => {
      await runSearch(e.target.value);
    }, 200));

    document.querySelectorAll(".member-select input").forEach(cb => {
      cb.addEventListener("change", () => runSearch(input.value));
    });

    document.getElementById("sortNew").addEventListener("click", () => {
      document.getElementById("sortNew").classList.add("active");
      document.getElementById("sortPopular").classList.remove("active");
      runSearch(input.value);
    });

    document.getElementById("sortPopular").addEventListener("click", () => {
      document.getElementById("sortPopular").classList.add("active");
      document.getElementById("sortNew").classList.remove("active");
      runSearch(input.value);
    });

    // 初期検索（空クエリで全件）
    runSearch("");

  } catch (err) {
    console.error('Failed to initialize search because:', err);
  }
})();

// 汎用 debounce
function debounce(fn, wait) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
