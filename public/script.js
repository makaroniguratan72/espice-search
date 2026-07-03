// script.js - 完全版（Pagefind 内部API自動検出 + entry.json フォールバック）
// そのまま public/script.js に上書きしてデプロイしてや

/* ユーティリティ -------------------------------------------------- */

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

// normalize entries for rendering
function normalizeEntries(entries) {
  return entries.map(e => {
    const d = e.data || e;
    return {
      id: d.id || d.url || d.path || (d.title && slugify(d.title)),
      title: d.title || d.name || '',
      excerpt: d.excerpt || d.summary || d.body || '',
      member: d.member || d.members || d.cast || '',
      views: d.views || d.view || 0,
      date: d.date || d.published || '',
      url: d.url || (d.id ? `pages/${d.id}.html` : '#'),
    };
  });
}

function slugify(s){ return String(s||'').toLowerCase().replace(/\s+/g,'-').replace(/[^\w-]/g,''); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
function debounce(fn, wait=200){ let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), wait); }; }

/* 描画 -------------------------------------------------- */

// renderResults: Pagefind の期待するクラス構造を模倣して出力（互換性確保）
function renderResults(items){
  const container = document.getElementById('searchResults');
  if(!container) return;
  container.innerHTML = '';

  // Pagefind UI が期待するラッパー構造を模倣する
  const wrapper = document.createElement('div');
  wrapper.className = 'pf-results pf-results--list';
  container.appendChild(wrapper);

  if(!items || items.length === 0){
    const no = document.createElement('div');
    no.className = 'no-results pf-no-results';
    no.textContent = '該当する動画が見つかりませんでした。';
    wrapper.appendChild(no);
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'pf-result pf-result--item result-item';

    const title = document.createElement('h3');
    title.className = 'pf-result__title result-title';
    const a = document.createElement('a');
    a.href = item.url || '#';
    a.innerHTML = escapeHtml(item.title || 'タイトルなし');
    title.appendChild(a);

    const meta = document.createElement('div');
    meta.className = 'pf-result__meta result-meta';
    meta.innerHTML = `<span class="meta-member">出演：${escapeHtml(item.member)}</span>
                      <span class="meta-views">再生数：${escapeHtml(String(item.views))}</span>
                      <span class="meta-date">投稿日：${escapeHtml(item.date)}</span>`;

    const excerpt = document.createElement('p');
    excerpt.className = 'pf-result__excerpt result-excerpt';
    excerpt.innerHTML = escapeHtml(item.excerpt || '');

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(excerpt);

    wrapper.appendChild(card);
  });
}

/* フォールバック全文検索 -------------------------------------------------- */

function fallbackSearch(entries, query){
  if(!query) return entries.slice();
  const q = query.trim().toLowerCase();
  return entries.filter(e => {
    const title = (e.title || e.name || '').toString().toLowerCase();
    const body = (e.excerpt || e.summary || e.body || '').toString().toLowerCase();
    const members = (e.member || e.members || '').toString().toLowerCase();
    return title.includes(q) || body.includes(q) || members.includes(q);
  });
}

/* 検索関数の自動検出（堅牢版） ---------------------------------------------
   - pf: window.pagefind オブジェクト
   - 戻り: { fn: async function(query), info: string } または null
------------------------------------------------------------------------- */
async function detectAndWrapSearchFunction(pf) {
  if (!pf) return null;

  // 候補名を収集（ただし $$ や set を含む内部名は除外）
  const topKeys = Object.keys(pf || {}).filter(k =>
    /search|find|query|run|index|client/i.test(k) && !/^\$+/.test(k) && !/set/i.test(k)
  );

  // _pfs の中身も候補に（ただし $$ で始まるものは除外）
  if (pf._pfs && typeof pf._pfs === 'object') {
    topKeys.push(...Object.keys(pf._pfs).filter(k => !/^\$+/.test(k) && !/set/i.test(k)).map(k => `_pfs.${k}`));
  }

  // 試す引数パターン（順に試す）
  const argPatterns = [
    q => [q],                       // string
    q => [{ query: q }],            // {query}
    q => [{ q }],                   // {q}
    q => [{ term: q }],             // {term}
    q => [{ text: q }],             // {text}
    q => [{ q: q, limit: 50 }],     // {q,limit}
    q => [{ query: q, options: {} }], // nested
  ];

  // 判定関数: 有効な結果形状か
  function isValidResult(x) {
    if (!x) return false;
    if (Array.isArray(x)) return true;
    if (typeof x === 'object' && (Array.isArray(x.results) || Array.isArray(x.pages) || Array.isArray(x.entries))) return true;
    return false;
  }

  // 実際に試す
  for (const name of topKeys) {
    let fn = null;
    try {
      if (name.startsWith('_pfs.')) {
        const key = name.split('.')[1];
        fn = pf._pfs && pf._pfs[key];
      } else {
        fn = pf[name];
      }
    } catch (e) {
      fn = null;
    }
    if (typeof fn !== 'function') continue;

    // skip suspicious internal names
    if (/^\$+/.test(name) || name.includes('$$') || /set/i.test(name)) continue;

    for (const pattern of argPatterns) {
      // wrapper を作る
      const wrapper = async (query) => {
        const args = pattern(query);
        const res = fn.apply(pf, args);
        const awaited = (res && typeof res.then === 'function') ? await res : res;
        if (isValidResult(awaited)) return awaited;
        if (awaited && typeof awaited === 'object') {
          if (Array.isArray(awaited.results)) return awaited;
          if (Array.isArray(awaited.pages)) return { results: awaited.pages };
          if (Array.isArray(awaited.entries)) return { results: awaited.entries };
        }
        throw new Error('invalid result shape');
      };

      // テスト実行（空文字で試す）
      try {
        const test = wrapper('');
        const maybe = (test && typeof test.then === 'function') ? await test : test;
        if (isValidResult(maybe)) {
          console.log(`Using pagefind.${name} with pattern as search function`);
          return { fn: wrapper, info: `${name}` };
        }
      } catch (e) {
        // 失敗したら次へ
      }
    }
  }

  // 見つからなければ null
  return null;
}

/* メイン -------------------------------------------------- */

(async () => {
  // 1) Pagefind UI を待つ
  const pf = await waitForPagefind(7000);
  console.log('pagefind (UI) instance:', pf);

  // 2) 検索関数を自動検出（ラップされた async 関数を返す）
  let searchFn = null;
  try {
    const wrapped = await detectAndWrapSearchFunction(pf);
    if (wrapped && wrapped.fn) {
      searchFn = wrapped.fn;
      console.log('Detected search function from pagefind:', wrapped.info || '(wrapped)');
    }
  } catch (e) {
    console.warn('detectAndWrapSearchFunction error:', e);
  }

  // 3) フォールバックで entry.json を読み込む（searchFn が無ければ必須）
  let fallbackEntries = null;
  if (!searchFn) {
    try {
      const res = await fetch('/pagefind/pagefind-entry.json', {cache:'no-store'});
      if (res.ok) {
        const json = await res.json();
        let entries = json.pages || json.entries || json.results || json || [];
        if (!Array.isArray(entries) && typeof entries === 'object') entries = Object.values(entries);
        fallbackEntries = normalizeEntries(entries);
        console.log('Loaded fallback entries count:', fallbackEntries.length);
      } else {
        console.warn('Failed to fetch pagefind-entry.json:', res.status);
      }
    } catch (e) {
      console.warn('Error fetching pagefind-entry.json:', e);
    }
  }

  // 4) runSearch 実装（searchFn があればそれを使い、なければ fallback）
  async function runSearch(query) {
    // try searchFn first
    if (searchFn) {
      try {
        const raw = await searchFn(query || '');
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
        // fall through to fallback
      }
    }

    // fallback
    if (fallbackEntries) {
      const matched = fallbackSearch(fallbackEntries, query || '');
      renderResults(matched);
      return;
    }

    // none available
    renderResults([]);
  }

  // 5) UI イベント登録
  const input = document.getElementById('searchInput');
  if (input) input.addEventListener('input', debounce(e => runSearch(e.target.value), 200));
  document.querySelectorAll('.member-select input').forEach(cb => cb.addEventListener('change', () => runSearch(input ? input.value : '')));
  const sortNewBtn = document.getElementById('sortNew');
  const sortPopularBtn = document.getElementById('sortPopular');
  if (sortNewBtn && sortPopularBtn) {
    sortNewBtn.addEventListener('click', () => { sortNewBtn.classList.add('active'); sortPopularBtn.classList.remove('active'); runSearch(input ? input.value : ''); });
    sortPopularBtn.addEventListener('click', () => { sortPopularBtn.classList.add('active'); sortNewBtn.classList.remove('active'); runSearch(input ? input.value : ''); });
  }

  // 6) 初期検索
  runSearch('');

  // debug info
  window.__espice_debug = { hasUI: !!pf, hasSearchFn: !!searchFn, fallbackCount: fallbackEntries ? fallbackEntries.length : 0 };
  console.log('espice debug:', window.__espice_debug);
})();
