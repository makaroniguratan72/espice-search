const template = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>{{title}} - ESPICE 踊ってみた動画</title>
  <link rel="stylesheet" href="../style.css">
</head>

<body>

  <div class="video-page">

    <h1>{{title}}</h1>
    <p class="member">出演：{{member}}</p>

    <div class="video-frame">
      <iframe width="560" height="315"
        src="https://www.youtube.com/embed/{{youtubeId}}"
        frameborder="0"
        allowfullscreen>
      </iframe>
    </div>

    <div class="video-info">
      <p><strong>再生数：</strong> {{views}} 回</p>
      <p><strong>投稿日：</strong> {{date}}</p>
    </div>

    <div class="description">
      <h2>動画説明</h2>
      <p>{{description}}</p>
    </div>

    <p>
      <a href="{{url}}" target="_blank">YouTubeで見る</a>
    </p>

    <p>
      <a href="../index.html">← 検索ページに戻る</a>
    </p>

  </div>

</body>
</html>
`;
