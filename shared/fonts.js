/* GAAAT 共通：見出し用フォントのプリセット
 *
 * バナーツール（app.js）の TITLE_FONT_PRESETS と同じ内容。欧文のディスプレイ体と、
 * 同じ雰囲気の和文体を組にしてあり、どちらもカバーしない文字（アラビア文字など）や
 * Webフォントの読み込みに失敗した場合は素のシステムスタックに落ちる。
 *
 * ポスターではタイトルは版元支給のロゴ画像なので、このフォントが効くのは
 * 会期の数字・会場名・バッジなどの文字組み。
 *
 * 現状はバナーツール側にも同じ定義が残っている（稼働中のツールに手を入れない
 * ための意図的な重複）。app.js を shared/ に寄せるときにこちらへ一本化する。
 */
(function (global) {
  const GAAAT = global.GAAAT || (global.GAAAT = {});

  const FONT_STACK = '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  const TITLE_FONT_PRESETS = {
    gothic: { label: '太字ゴシック（デフォルト）', stack: `"Oswald", "Noto Sans JP", ${FONT_STACK}`, recommended: true },
    mincho: { label: '明朝・上品', stack: `"Playfair Display", "Shippori Mincho", ${FONT_STACK}` },
    rounded: { label: '丸ゴシック・ポップ', stack: `"Fredoka", "M PLUS Rounded 1c", ${FONT_STACK}` },
    cyber: { label: 'サイバー・近未来', stack: `"Orbitron", "Noto Sans JP", ${FONT_STACK}` },
    clean: { label: 'シンプル・ゴシック', stack: `"Inter", "Noto Sans JP", ${FONT_STACK}` },
    impact: { label: '極太インパクト・ポスター風', stack: `"Anton", "Noto Sans JP", ${FONT_STACK}`, recommended: true },
    comic: { label: 'コミック・レトロポップ', stack: `"Bangers", "Reggae One", ${FONT_STACK}` },
    brush: { label: '筆文字・和風', stack: `"Cardo", "Yuji Syuku", ${FONT_STACK}`, recommended: true },
    pixel: { label: 'ドット・レトロゲーム風', stack: `"Press Start 2P", "DotGothic16", ${FONT_STACK}` },
    elegant: { label: 'モダン・エレガント', stack: `"Poppins", "Zen Kaku Gothic New", ${FONT_STACK}` },
    bebas: { label: 'コンデンス・スタイリッシュ', stack: `"Bebas Neue", "Stick", ${FONT_STACK}` },
    script: { label: '手書き風スクリプト', stack: `"Pacifico", "Yomogi", ${FONT_STACK}` },
    classic: { label: 'クラシック・格調高い', stack: `"Abril Fatface", "Zen Old Mincho", ${FONT_STACK}` },
    blackGrotesk: { label: '極太グロテスク', stack: `"Archivo Black", "Dela Gothic One", ${FONT_STACK}` },
    friendlyRound: { label: 'フレンドリー・丸ゴシック', stack: `"Baloo 2", "Kosugi Maru", ${FONT_STACK}` },
    markerPop: { label: 'マーカー手書き・ポップ', stack: `"Permanent Marker", "Klee One", ${FONT_STACK}` },
    urbanBold: { label: 'アーバン・重厚感', stack: `"Bungee", "RocknRoll One", ${FONT_STACK}` },
    slabHeavy: { label: '極太スラブセリフ', stack: `"Alfa Slab One", "Mochiy Pop One", ${FONT_STACK}` },
    condensedImpact: { label: 'コンデンス・見出し向け', stack: `"Staatliches", "Yusei Magic", ${FONT_STACK}` },
    engraved: { label: '彫刻風・重厚', stack: `"Cinzel", "New Tegomin", ${FONT_STACK}` },
    handwriting: { label: 'ナチュラル手書き', stack: `"Caveat", "Kiwi Maru", ${FONT_STACK}` },
    terminal: { label: 'レトロ端末・ドット', stack: `"VT323", "DotGothic16", ${FONT_STACK}` },
    elegantThin: { label: '上品・細字エレガント', stack: `"Julius Sans One", "Hina Mincho", ${FONT_STACK}` },
    typewriter: { label: 'タイプライター・ヴィンテージ', stack: `"Special Elite", "Shippori Antique", ${FONT_STACK}` },
    warmSerif: { label: '温かみのあるセリフ', stack: `"Cormorant Garamond", "Kaisei Opti", ${FONT_STACK}` }
  };

  function stackFor(key) {
    const preset = TITLE_FONT_PRESETS[key];
    return (preset || TITLE_FONT_PRESETS.gothic).stack;
  }

  // canvasは「フォントが未読込でも黙って代替で描いてしまう」ので、
  // 書き出し前に必ずこれを待つ。待たないと入稿データだけ書体が違う、が起きる。
  async function ensureLoaded(stack, sizesPx) {
    if (!document.fonts || !document.fonts.load) return;
    const sizes = sizesPx || [80, 200];
    try {
      await Promise.all(sizes.map(s => document.fonts.load(`700 ${s}px ${stack}`, 'あA0')));
      await document.fonts.ready;
    } catch (e) { /* 読めなくてもフォールバックで描ける */ }
  }

  GAAAT.fonts = { FONT_STACK, TITLE_FONT_PRESETS, stackFor, ensureLoaded };
})(window);
