// script.js - Pagefind API 自動検出 + entry.json フォールバック実装

// wait for window.pagefind (UI) がセットされるまで待つ
function waitForPagefind(timeout = 7000) {
  return new Promise((resolve) => {
    if (window.pagefind) return resolve(window.pagefind);
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
          resolve(null);
        }
      }
    }, interval);
  });
}

// 簡易全文検索（フォールバック用）
// entries: 配列（pagefind-entry.json の中身を想定）
// query: 検索語
function fallbackSearchEntries(entries, query) {
  if (!query) return entries.slice();
  const q = query.trim().toLowerCase();
  return entries.filter(e => {
    // 可能性のあるフィールドをまとめて検索
    const title = (e.title || e.name || e.data?.title || '').toString().toLowerCase();
    const body = (e.body || e.excerpt || e.data?.excerpt || e.data?.content || '').toString().toLowerCase();
    const members = (e.data?.member || e.data?.members || e.member || '').toString().toLowerCase();
    return title.includes(q) || body.includes(q) || members.includes(q);
  });
}

// entries を render 用の item 配列に変換
function normalizeEntries(entries) {
  return entries.map(e => {
    // pagefind-entry.json の構造はビルド設定で変わるので安全に取り出す
    const data = e.data || e;
    return {
      id: data.id || data.url || data.path || (data.title && slugify(data.title)),
      title: data.title || data.name || '',
      excerpt: data.excerpt || data.summary || data.body || '',
      member: data.member || data.members || data.cast || '',
      views: data.views || data.view || 0,
      date: data.date || data.published || '',
      url: data.url || (data.id ? `pages/${data.id}.html` : '#'),
    };
  });
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

// 描画
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
    div.innerHTML = `
      <h3 class="result-title"><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></h3>
      <div class="result-meta">
        <span class="meta-member">出演：${escapeHtml(item.member)}</span>
        <span class="meta-views">再生数：${escapeHtml(String(item.views))}</span>
        <span class="meta-date">投稿日：${escapeHtml(item.date)}</span>
      </div>
      <p class="result-excerpt">${escapeHtml(item.excerpt)}</p>
    `;
    container.appendChild(div);
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// debounce
function debounce(fn, wait=200){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), wait);
  };
}

// メイン
(async () => {
  // 1) Pagefind UI があるか待つ
  const pf = await waitForPagefind(7000);
  console.log('pagefind (UI) instance:', pf);

  // 2) 可能な検索関数を自動検出
  let searchFn = null;
  if (pf) {
    // いくつかの候補をチェック
    const candidates = [
      'search', 'query', 'searcher', 'run', 'find', 'searchIndex', 'client', 'index'
    ];
    for (const name of candidates) {
      // direct function
      if (typeof pf[name] === 'function') {
        searchFn = async (q) => pf[name](q);
        console.log('Using pagefind.'+name+'() as search function');
        break;
      }
      // nested objects (pf.client.search etc.)
      if (pf[name] && typeof pf[name].search === 'function') {
        searchFn = async (q) => pf[name].search(q);
        console.log('Using pagefind.'+name+'.search() as search function');
        break;
      }
    }
  }

  // 3) モジュールが export を出してない場合や searchFn が無い場合は entry.json をフェッチしてフォールバック
  let fallbackEntries = null;
  if (!searchFn) {
    try {
      const res = await fetch('/pagefind/pagefind-entry.json', {cache: 'no-store'});
      if (res.ok) {
        const json = await res.json();
        // pagefind-entry.json の構造は { pages: [...] } や { entries: [...] } など様々
        let entries = json.pages || json.entries || json.results || json || [];
        // if it's an object map, convert to array
        if (!Array.isArray(entries) && typeof entries === 'object') {
          entries = Object.values(entries);
        }
        fallbackEntries = normalizeEntries(entries);
        console.log('Loaded fallback entries count:', fallbackEntries.length);
      } else {
        console.warn('Failed to fetch pagefind-entry.json:', res.status);
      }
    } catch (e) {
      console.warn('Error fetching pagefind-entry.json:', e);
    }
  }

  // 4) runSearch: searchFn があればそれを使い、なければ fallbackEntries を使う
  async function runSearch(query) {
    // UI があるが searchFn がまだ無いケース
    if (searchFn) {
      try {
        const raw = await searchFn(query || '');
        // raw の形は様々。安全に items を取り出す
        const resultsArray = (raw && raw.results) ? raw.results : (Array.isArray(raw) ? raw : []);
        const items = resultsArray.map(r => {
          const d = r.data || r;
          return {
            title: d.title || d.name || '',
            excerpt: d.excerpt || d.summary || d.body || '',
            member: d.member || d.members || '',
            views: d.views || 0,
            date: d.date || d.published || '',
            url: d.url || (d.id ? `pages/${d.id}.html` : '#'),
          };
        });
        renderResults(items);
        return;
      } catch (e) {
        console.warn('searchFn failed, falling back to entry.json:', e);
      }
    }

    // フォールバック検索
    if (fallbackEntries) {
      const matched = fallbackSearchEntries(fallbackEntries, query || '');
      // 既に normalized されてるのでそのまま render
      renderResults(matched);
      return;
    }

    // どれも無い場合は空表示
    renderResults([]);
  }

  // 5) UI イベント登録（input, filters, sort）
  const input = document.getElementById('searchInput');
  if (input) {
    input.addEventListener('input', debounce((e) => runSearch(e.target.value), 200));
  }

  document.querySelectorAll('.member-select input').forEach(cb => {
    cb.addEventListener('change', () => runSearch(input ? input.value : ''));
  });

  const sortNewBtn = document.getElementById('sortNew');
  const sortPopularBtn = document.getElementById('sortPopular');
  if (sortNewBtn && sortPopularBtn) {
    sortNewBtn.addEventListener('click', () => {
      sortNewBtn.classList.add('active');
      sortPopularBtn.classList.remove('active');
      runSearch(input ? input.value : '');
    });
    sortPopularBtn.addEventListener('click', () => {
      sortPopularBtn.classList.add('active');
      sortNewBtn.classList.remove('active');
      runSearch(input ? input.value : '');
    });
  }

  // 6) 初期検索（空クエリ）
  runSearch('');

  // デバッグ用に window に公開
  window.__espice_debug = {
    hasUI: !!pf,
    hasSearchFn: !!searchFn,
    fallbackCount: fallbackEntries ? fallbackEntries.length : 0
  };
  console.log('espice debug:', window.__espice_debug);
})();
