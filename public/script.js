// script.js - Pagefind のブラウザ検索 API を優先して使う完全版
// public/script.js に上書きしてください

/* ユーティリティ -------------------------------------------------- */
function slugify(s){ return String(s||'').toLowerCase().replace(/\s+/g,'-').replace(/[^\w-]/g,''); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
function debounce(fn, wait=200){ let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), wait); }; }

/* normalizeEntries - 生データから扱いやすい形に変換 */
function normalizeEntries(entries) {
  return (entries || []).map(e => {
    const d = e.data || e || {};
    const urlCandidates = [
      d.url,
      d.permalink,
      d.path,
      d.output_path,
      d.output,
      d.relative_url,
      d.link,
      d.href
    ].filter(Boolean);
    let url = urlCandidates.length ? String(urlCandidates[0]) : null;
    if (url && !/^https?:\/\//i.test(url) && !url.startsWith('/')) {
      url = url.startsWith('./') ? url.slice(2) : `/${url}`;
    }
    if (!url) {
      const id = d.id || d.slug || (d.title ? slugify(d.title) : null);
      url = id ? `/pages/${id}.html` : '#';
    }
    return {
      id: d.id || d.slug || (d.title ? slugify(d.title) : ''),
      title: d.title || d.name || '',
      excerpt: d.excerpt || d.summary || d.body || '',
      member: d.member || d.members || d.cast || '',
      views: Number(d.views || d.view || 0) || 0,
      date: d.date || d.published || '',
      url: url
    };
  });
}

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
    a.textContent = item.title || 'タイトルなし';
    title.appendChild(a);

    const meta = document.createElement('div');
    meta.className = 'pf-result__meta result-meta wiki-meta';
    meta.innerHTML = `<span class="meta-member">出演：${escapeHtml(item.member)}</span>
                      <span class="meta-views">再生数：${escapeHtml(String(item.views))}</span>
                      <span class="meta-date">投稿日：${escapeHtml(item.date)}</span>`;

    const excerpt = document.createElement('p');
    excerpt.className = 'pf-result__excerpt result-excerpt wiki-excerpt';
    excerpt.textContent = item.excerpt || '';

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

/* Pagefind を明示的に初期化するフォールバック（import.meta 回避） ------------- */
/*
  説明:
  - サーバに配信される pagefind.js が ESM/UMD の混在やキャッシュで問題を起こす場合がある。
  - ここでは UMD がグローバルに提供する Pagefind コンストラクタが存在する場合に、
    明示的に basePath を渡してインスタンス化・初期化することで import.meta の分岐を回避する。
  - 言語はインデックスに合わせて 'ja' などに変更してください。
*/
(function ensurePagefindInstance() {
  try {
    // 既に初期化済みなら何もしない
    if (window.__pagefind_initialized) return;

    // UMD 版がグローバルに Pagefind を提供しているケース
    const PagefindCtor = window.Pagefind || window.pagefindConstructor || null;

    if (typeof PagefindCtor === 'function' && !window.pagefind) {
      // basePath を明示的に指定して import.meta 分岐を回避する
      window.pagefind = new PagefindCtor({ basePath: '/pagefind/' });
      // 必要に応じて言語を指定して初期化（例: 'ja'）
      if (window.pagefind.init && typeof window.pagefind.init === 'function') {
        window.pagefind.init('ja').then(() => {
          window.__pagefind_initialized = true;
          console.log('Pagefind instance created and initialized (fallback).');
        }).catch(e => {
          console.warn('Pagefind fallback init failed:', e);
        });
      } else {
        // init が無ければ即フラグを立てる
        window.__pagefind_initialized = true;
        console.log('Pagefind instance created (fallback, no init).');
      }
    }
  } catch (e) {
    console.warn('ensurePagefindInstance error:', e);
  }
})();

/* Pagefind 検索を使うランナー --------------------------------------------- */
async function runSearch(query, options = {}) {
  // 1) もしブラウザに pagefind.search があればそれを使う（優先）
  if (window.pagefind && typeof window.pagefind.search === 'function') {
    try {
      // pagefind.search の呼び出し方は実装により異なることがあるため、
      // 文字列クエリかオブジェクトを渡す柔軟性を持たせる
      const raw = await (typeof query === 'string' ? window.pagefind.search(query) : window.pagefind.search(query || ''));
      // raw may be { results: [...] } or array
      const resultsArray = raw && raw.results ? raw.results : (Array.isArray(raw) ? raw : []);
      const items = normalizeEntries(resultsArray);
      renderResults(items);
      return;
    } catch (e) {
      console.warn('window.pagefind.search failed, falling back to entry.json/fallback:', e);
    }
  }

  // 2) フォールバック: pagefind-entry.json を読む（既にある場合）
  try {
    const res = await fetch('/pagefind/pagefind-entry.json', {cache:'no-store'});
    if (res.ok) {
      const json = await res.json();
      let entries = json.pages || json.entries || json.results || json.documents || json || [];
      if (!Array.isArray(entries) && typeof entries === 'object') entries = Object.values(entries);
      const norm = normalizeEntries(entries);
      const matched = fallbackSearch(norm, query || '');
      renderResults(matched);
      return;
    }
  } catch (e) {
    console.warn('fallback fetch failed:', e);
  }

  // 3) 最終的に空を描画
  renderResults([]);
}

/* 初期化 -------------------------------------------------- */
(function initSearchUI(){
  const input = document.getElementById('searchInput');
  if (input) input.addEventListener('input', debounce(e => runSearch(e.target.value), 200));

  document.querySelectorAll('.member-select input').forEach(cb => cb.addEventListener('change', () => runSearch(input ? input.value : '')));

  const sortNewBtn = document.getElementById('sortNew');
  const sortPopularBtn = document.getElementById('sortPopular');
  if (sortNewBtn && sortPopularBtn) {
    sortNewBtn.addEventListener('click', () => { sortNewBtn.classList.add('active'); sortPopularBtn.classList.remove('active'); runSearch(input ? input.value : ''); });
    sortPopularBtn.addEventListener('click', () => { sortPopularBtn.classList.add('active'); sortNewBtn.classList.remove('active'); runSearch(input ? input.value : ''); });
  }

  // Pagefind UI が読み込まれるのを待ってから初期検索（空クエリ）
  const waitForPF = setInterval(() => {
    // window.pagefind が使えるか、あるいは明示初期化フラグが立っているかを確認
    if ((window.pagefind && typeof window.pagefind.search === 'function') || window.__pagefind_initialized) {
      clearInterval(waitForPF);
      // もし Pagefind が初期化済みなら Pagefind 経由で全件表示を試みる
      runSearch(''); // 全件表示
      console.log('Initial runSearch via window.pagefind.search or fallback init');
    }
  }, 100);

  // タイムアウトでフォールバックの entry.json を使って初期表示
  setTimeout(() => {
    if (!(window.pagefind && typeof window.pagefind.search === 'function') && !window.__pagefind_initialized) {
      console.log('pagefind.search not available, using fallback entry.json');
      runSearch('');
    }
  }, 3000);
})();
