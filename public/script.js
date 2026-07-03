// script.js - 完全版（内部API自動検出 + entry.json フォールバック + 初期全件表示）
// public/script.js に上書きしてください

/* ユーティリティ -------------------------------------------------- */

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

function renderResults(items){
  const container = document.getElementById('searchResults');
  if(!container) return;
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'pf-results pf-results--list wiki-results';
  container.appendChild(wrapper);

  if(!items || items.length === 0){
    const no = document.createElement('div');
    no.className = 'no-results pf-no-results wiki-no-results';
    no.textContent = '該当する動画が見つかりませんでした。';
    wrapper.appendChild(no);
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'pf-result pf-result--item result-item wiki-result';

    const title = document.createElement('h3');
    title.className = 'pf-result__title result-title wiki-title';
    const a = document.createElement('a');
    a.href = item.url || '#';
    a.innerHTML = escapeHtml(item.title || 'タイトルなし');
    title.appendChild(a);

    const meta = document.createElement('div');
    meta.className = 'pf-result__meta result-meta wiki-meta';
    meta.innerHTML = `<span class="meta-member">出演：${escapeHtml(item.member)}</span>
                      <span class="meta-views">再生数：${escapeHtml(String(item.views))}</span>
                      <span class="meta-date">投稿日：${escapeHtml(item.date)}</span>`;

    const excerpt = document.createElement('p');
    excerpt.className = 'pf-result__excerpt result-excerpt wiki-excerpt';
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

/* 検索関数の自動検出（堅牢版） --------------------------------------------- */

async function detectAndWrapSearchFunction(pf) {
  if (!pf) return null;

  const topKeys = Object.keys(pf || {}).filter(k =>
    /search|find|query|run|index|client/i.test(k) && !/^\$+/.test(k) && !/set/i.test(k)
  );

  if (pf._pfs && typeof pf._pfs === 'object') {
    topKeys.push(...Object.keys(pf._pfs).filter(k => !/^\$+/.test(k) && !/set/i.test(k)).map(k => `_pfs.${k}`));
  }

  const argPatterns = [
    q => [q],
    q => [{ query: q }],
    q => [{ q }],
    q => [{ term: q }],
    q => [{ text: q }],
    q => [{ q: q, limit: 50 }],
    q => [{ query: q, options: {} }],
  ];

  function isValidResult(x) {
    if (!x) return false;
    if (Array.isArray(x)) return true;
    if (typeof x === 'object' && (Array.isArray(x.results) || Array.isArray(x.pages) || Array.isArray(x.entries))) return true;
    return false;
  }

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
    if (/^\$+/.test(name) || name.includes('$$') || /set/i.test(name)) continue;

    for (const pattern of argPatterns) {
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

      try {
        const test = wrapper('');
        const maybe = (test && typeof test.then === 'function') ? await test : test;
        if (isValidResult(maybe)) {
          console.log(`Using pagefind.${name} as search function`);
          return { fn: wrapper, info: `${name}` };
        }
      } catch (e) {
        // 次のパターンへ
      }
    }
  }

  return null;
}

/* メイン -------------------------------------------------- */

(async () => {
  const pf = await waitForPagefind(7000);
  console.log('pagefind (UI) instance:', pf);

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

  // フォールバック互換パッチ：window.pagefind.search を注入
  if (!searchFn && fallbackEntries) {
    if (!window.pagefind) window.pagefind = {};
    if (typeof window.pagefind.search !== 'function') {
      window.pagefind.search = async function(query) {
        const q = (query || '').toString().trim().toLowerCase();
        const matched = (q.length > 0)
          ? fallbackEntries.filter(e => {
              return (e.title || '').toLowerCase().includes(q)
                  || (e.excerpt || '').toLowerCase().includes(q)
                  || (e.member || '').toLowerCase().includes(q);
            })
          : fallbackEntries.slice();

        const results = matched.map(m => ({ data: {
          id: m.id, title: m.title, excerpt: m.excerpt, member: m.member,
          views: m.views, date: m.date, url: m.url
        }}));

        return { results };
      };
      console.log('Injected fallback pagefind.search (uses pagefind-entry.json results).');
    }

    // 初期表示で全件をレンダリング（フォールバック読み込み完了直後）
    try {
      if (fallbackEntries && fallbackEntries.length) {
        renderResults(fallbackEntries);
        console.log('Initial render: displayed all fallback entries.');
      }
    } catch (e) {
      console.warn('Initial render failed:', e);
    }
  }

  async function runSearch(query) {
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
      }
    }

    if (fallbackEntries) {
      const matched = fallbackSearch(fallbackEntries, query || '');
      renderResults(matched);
      return;
    }

    renderResults([]);
  }

  const input = document.getElementById('searchInput');
  if (input) input.addEventListener('input', debounce(e => runSearch(e.target.value), 200));
  document.querySelectorAll('.member-select input').forEach(cb => cb.addEventListener('change', () => runSearch(input ? input.value : '')));
  const sortNewBtn = document.getElementById('sortNew');
  const sortPopularBtn = document.getElementById('sortPopular');
  if (sortNewBtn && sortPopularBtn) {
    sortNewBtn.addEventListener('click', () => { sortNewBtn.classList.add('active'); sortPopularBtn.classList.remove('active'); runSearch(input ? input.value : ''); });
    sortPopularBtn.addEventListener('click', () => { sortPopularBtn.classList.add('active'); sortNewBtn.classList.remove('active'); runSearch(input ? input.value : ''); });
  }

  // 既に初期表示を行っている場合はここでの runSearch('') は不要,
  // ただし searchFn がある場合は空クエリで初期検索を試みる
  if (searchFn) runSearch('');

  window.__espice_debug = { hasUI: !!pf, hasSearchFn: !!searchFn, fallbackCount: fallbackEntries ? fallbackEntries.length : 0 };
  console.log('espice debug:', window.__espice_debug);
})();
