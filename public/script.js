// script.js - Pagefind 内部 API を自動検出して使う + entry.json フォールバック
// そのまま public/script.js に上書きしてデプロイしてや

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

// render results (adds Pagefind-like classes to help CSS)
function renderResults(items){
  const container = document.getElementById('searchResults');
  container.innerHTML = '';
  container.classList.add('pagefind-ui'); // Pagefind CSS が特定クラスを参照する場合に備える

  if(!items || items.length === 0){
    container.innerHTML = '<div class="no-results">該当する動画が見つかりませんでした。</div>';
    return;
  }

  items.forEach(item => {
    const div = document.createElement('article');
    div.className = 'result-item pf-result'; // pf-result は Pagefind 系のクラス名に合わせるための保険
    const link = escapeHtml(item.url || '#');
    div.innerHTML = `
      <h3 class="result-title"><a href="${link}">${escapeHtml(item.title)}</a></h3>
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

// フォールバック全文検索（entry.json を使う）
function fallbackSearch(entries, query){
  if(!query) return entries.slice();
  const q = query.trim().toLowerCase();
  return entries.filter(e => {
    const title = (e.title || e.name || e.title || '').toString().toLowerCase();
    const body = (e.excerpt || e.summary || e.body || '').toString().toLowerCase();
    const members = (e.member || e.members || '').toString().toLowerCase();
    return title.includes(q) || body.includes(q) || members.includes(q);
  });
}

// 自動検出ロジック：pagefind オブジェクトや内部 _pfs を調べて search 関数を探す
function detectSearchFunction(pf){
  if(!pf) return null;

  // 1) 直接的な関数
  const directNames = ['search','query','find','run','searchIndex','searcher'];
  for(const n of directNames){
    if(typeof pf[n] === 'function') return async (q)=>pf[n](q);
  }

  // 2) nested objects (pf.client.search, pf.index.search, pf._pfs.search 等)
  const nestedPaths = [
    ['client','search'],
    ['index','search'],
    ['_pfs','search'],
    ['_pfs','index','search'],
    ['_pfs','client','search']
  ];
  for(const path of nestedPaths){
    let cur = pf;
    let ok = true;
    for(const p of path){
      if(cur && typeof cur[p] !== 'undefined') cur = cur[p];
      else { ok = false; break; }
    }
    if(ok && typeof cur === 'function') {
      return async (q)=>cur(q);
    }
  }

  // 3) _pfs 内の関数を列挙して最初の関数を使う（最終手段）
  if(pf._pfs && typeof pf._pfs === 'object'){
    const keys = Object.keys(pf._pfs);
    for(const k of keys){
      if(typeof pf._pfs[k] === 'function') {
        console.log('Using pagefind._pfs.'+k+' as search function (best-effort)');
        return async (q)=>pf._pfs[k](q);
      }
    }
  }

  return null;
}

// メイン処理
(async () => {
  // 1) Pagefind UI を待つ
  const pf = await waitForPagefind(7000);
  console.log('pagefind (UI) instance:', pf);

  // 2) 検索関数を自動検出
  let searchFn = detectSearchFunction(pf);
  if(searchFn) console.log('Detected search function from pagefind.');

  // 3) フォールバックで entry.json を読み込む（searchFn が無ければ必須）
  let fallbackEntries = null;
  if(!searchFn){
    try{
      const res = await fetch('/pagefind/pagefind-entry.json', {cache:'no-store'});
      if(res.ok){
        const json = await res.json();
        let entries = json.pages || json.entries || json.results || json || [];
        if(!Array.isArray(entries) && typeof entries === 'object') entries = Object.values(entries);
        fallbackEntries = normalizeEntries(entries);
        console.log('Loaded fallback entries count:', fallbackEntries.length);
      } else {
        console.warn('Failed to fetch pagefind-entry.json:', res.status);
      }
    }catch(e){
      console.warn('Error fetching pagefind-entry.json:', e);
    }
  }

  // 4) runSearch 実装（searchFn があればそれを使い、なければ fallback）
  async function runSearch(query){
    // if searchFn exists, try it first
    if(searchFn){
      try{
        const raw = await searchFn(query || '');
        // raw の形は様々なので安全に取り出す
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
      }catch(e){
        console.warn('searchFn failed, falling back to entry.json:', e);
      }
    }

    // fallback
    if(fallbackEntries){
      const matched = fallbackSearch(fallbackEntries, query || '');
      renderResults(matched);
      return;
    }

    // どれも無ければ空表示
    renderResults([]);
  }

  // 5) UI イベント登録
  const input = document.getElementById('searchInput');
  if(input) input.addEventListener('input', debounce(e => runSearch(e.target.value), 200));
  document.querySelectorAll('.member-select input').forEach(cb => cb.addEventListener('change', () => runSearch(input ? input.value : '')));
  const sortNewBtn = document.getElementById('sortNew');
  const sortPopularBtn = document.getElementById('sortPopular');
  if(sortNewBtn && sortPopularBtn){
    sortNewBtn.addEventListener('click', () => { sortNewBtn.classList.add('active'); sortPopularBtn.classList.remove('active'); runSearch(input ? input.value : ''); });
    sortPopularBtn.addEventListener('click', () => { sortPopularBtn.classList.add('active'); sortNewBtn.classList.remove('active'); runSearch(input ? input.value : ''); });
  }

  // 6) 初期検索
  runSearch('');

  // debug info
  window.__espice_debug = { hasUI: !!pf, hasSearchFn: !!searchFn, fallbackCount: fallbackEntries ? fallbackEntries.length : 0 };
  console.log('espice debug:', window.__espice_debug);
})();
