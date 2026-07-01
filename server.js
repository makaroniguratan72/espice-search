const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// public を静的配信
app.use(express.static(path.join(__dirname, "public")));

// site も静的配信（Pagefind が使う）
app.use("/site", express.static(path.join(__dirname, "site")));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
