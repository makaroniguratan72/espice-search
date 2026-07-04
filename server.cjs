const express = require('express');
const path = require('path');
const app = express();

// ------------------------------------------------------------
// ★ 1. public フォルダを静的配信
// ------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------
// ★ 2. Pagefind の静的ファイルを配信（これが今回の本命）
// ------------------------------------------------------------
app.use('/pagefind', express.static(path.join(__dirname, 'public/pagefind')));

// ------------------------------------------------------------
// ★ 3. ルート（index.html を返す）
// ------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ------------------------------------------------------------
// ★ 4. Render 用ポート設定
// ------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ESPICE Search server running on port ${PORT}`);
});
