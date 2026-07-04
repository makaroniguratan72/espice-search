// ===============================
// ESPICE SEARCH - fallback専用 完全版（サムネ対応 + ひらがな検索）
// ===============================

// HTMLエスケープ
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// デバウンス
function debounce(fn, wait=200){
  let t;
  return function(...a){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,a), wait);
  };
}

// JSON → 内部形式へ整形
function normalizeEntries(entries){
  return entries.map(e => {
    return {
      id: e.id,
      title: e.title || '',
      members: Array.isArray(e.members) ? e.members : [],
      youtubeId: e.youtubeId || '',
      url: e.url || '',
      views: Number(e.views || 0),
      date: e.date || '',
      description: e.description || '',
      thumbnail: e.thumbnail || ''   // ★ サムネ対応
    };
  });
}

// ひらがな → カタカナ変換
function hiraToKana(str) {
  return str.replace(/[\u3041-\u3096]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

// AND 絞り込み（メンバー）
function filterByMembers(entries, selectedMembers){
  if(selectedMembers.length === 0) return entries;
  return entries.filter(e => {
    return selectedMembers.every(m => e.members.includes(m));
  });
}

// 全文検索（ひらがな部分一致対応）
function fallbackSearch(entries, query){
  if(!query) return entries;

  // 入力をひらがな→カタカナへ変換
  const q = hiraToKana(query.trim().toLowerCase());

  return entries.filter(e => {
    const title = hiraToKana(e.title.toLowerCase());
    const desc  = hiraToKana(e.description.toLowerCase());
    const mem   = hiraToKana(e.members.join(' ').toLowerCase());

    return title.includes(q) || desc.includes(q) || mem.includes(q);
  });
}

// ソート
function sortEntries(entries, mode){
  if(mode === 'new'){
    return [...entries].sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  }
  if(mode === 'popular'){
    return [...entries].sort((a,b) => b.views - a.views);
  }
  return entries;
}

// 描画（★サムネ対応）
function renderResults(items){
  const container = document.getElementById('searchResults');
  container.innerHTML = '';

  if(items.length === 0){
    container.innerHTML = '<div class="no-results">該当する動画が見つかりませんでした。</div>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'result-card';

    card.innerHTML = `
      <img src="${item.thumbnail}" class="result-thumb">

      <div class="result-body">
        <h3><a href="${item.url}" target="_blank">${escapeHtml(item.title)}</a></h3>

        <div class="meta">
          <span>出演：${escapeHtml(item.members.join(', '))}</span>
          <span style="display:none;">再生数：${item.views}</span>
          <span>投稿日：${escapeHtml(item.date)}</span>
        </div>

        <p>${escapeHtml(item.description)}</p>
      </div>
    `;

    container.appendChild(card);
  });
}

// メイン検索処理
async function runSearch(){
  const query = document.getElementById('searchInput').value || '';

  // メンバー選択
  const selectedMembers = [...document.querySelectorAll('.member-select input:checked')]
    .map(cb => cb.value);

  // ソートモード
  const mode = document.querySelector('#sortPopular.active') ? 'popular' : 'new';

  // JSON 読み込み
  const res = await fetch('/pagefind/pagefind-entry.json', {cache:'no-store'});
  const raw = await res.json();
  let entries = normalizeEntries(raw);

  // 絞り込み
  entries = fallbackSearch(entries, query);
  entries = filterByMembers(entries, selectedMembers);
  entries = sortEntries(entries, mode);

  renderResults(entries);
}

// 初期化
(function init(){
  const input = document.getElementById('searchInput');
  input.addEventListener('input', debounce(runSearch, 200));

  document.querySelectorAll('.member-select input')
    .forEach(cb => cb.addEventListener('change', runSearch));

  const sortNew = document.getElementById('sortNew');
  const sortPopular = document.getElementById('sortPopular');

  sortNew.addEventListener('click', () => {
    sortNew.classList.add('active');
    sortPopular.classList.remove('active');
    runSearch();
  });

  sortPopular.addEventListener('click', () => {
    sortPopular.classList.add('active');
    sortNew.classList.remove('active');
    runSearch();
  });

  // 初期表示
  runSearch();
})();
