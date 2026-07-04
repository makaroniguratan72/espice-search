const express = require('express');
const path = require('path');
const app = express();

// ------------------------------------------------------------
// ★ public フォルダを静的配信（index.html も含む）
// ------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------
// ★ Pagefind の静的ファイルを配信（これが今回の本命）
// ------------------------------------------------------------
app.use('/pagefind', express.static(path.join(__dirname, 'public/pagefind')));

// ------------------------------------------------------------
// ★ ルートは static に任せる（←これが重要）
// ------------------------------------------------------------
// app.get('/', ...) は不要。static が自動で index.html を返す。

// ------------------------------------------------------------
// ★ Render 用ポート設定
// ------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ESPICE Search server running on port ${PORT}`);
});
