/* GAAAT 共通：印刷ジオメトリ（mm ↔ px・塗り足し・トンボ）
 *
 * バナーツール（1080px固定）と違い、ポスター／リーフレットはすべての座標を
 * mm で決めて最後に dpi を掛ける。こうしておくと「画面プレビューは軽い解像度、
 * 書き出しだけ入稿用の高解像度」を、版を1pxもずらさずに実現できる。
 * leaflet/app.js の geometry() を用紙非依存に一般化したもの。
 */
(function (global) {
  const GAAAT = global.GAAAT || (global.GAAAT = {});

  // 仕上がりサイズ（縦位置）。A1とA2は√2の相似なので、レイアウトは
  // 「仕上がり枠に対する0〜1の正規化座標」で1本だけ持てば両方に使える。
  const PAPERS = {
    A1: { label: 'A1（594 × 841mm）', wMm: 594, hMm: 841 },
    A2: { label: 'A2（420 × 594mm）', wMm: 420, hMm: 594 }
  };

  // 画面プレビューは長辺をこの画素数に固定する。leaflet は固定dpi（110）だが、
  // A1で110dpiにすると2572×3641px＝約940万画素になり、1文字打つたびの再描画に
  // 耐えられない。長辺基準にすると用紙サイズによらずプレビューの重さが一定になる。
  const PREVIEW_LONG_EDGE_PX = 1400;

  // Safari の canvas 面積上限（約1677万画素）。A1@150dpi は1742万画素で
  // これを超えるため、書き出し前に警告を出す判定に使う。
  const SAFARI_MAX_CANVAS_AREA = 16777216;

  function previewDpi(paperKey) {
    const p = PAPERS[paperKey] || PAPERS.A1;
    return PREVIEW_LONG_EDGE_PX / (p.hMm / 25.4);
  }

  /**
   * 用紙・dpi・塗り足しから、描画に必要な寸法をまとめて返す。
   * dpi だけ差し替えれば、プレビューと入稿用でまったく同じレイアウトが出る。
   *
   * 座標系は2つある:
   *   g.mm(v)      … mm を px に（絶対寸法。QRやコピーライトの下限に使う）
   *   g.x(f)/g.y(f)… 仕上がり枠に対する 0〜1 の割合を px に（レイアウト本体）
   * どちらも塗り足しぶんのオフセット（g.ox/g.oy）を含んだ絶対座標を返す。
   */
  function geometry(paperKey, dpi, bleedMm) {
    const p = PAPERS[paperKey] || PAPERS.A1;
    const k = dpi / 25.4;                       // 1mmあたりのピクセル数
    const bleed = Math.max(0, Math.min(10, Number(bleedMm) || 0));
    const ox = bleed * k;
    const oy = bleed * k;
    const trimW = p.wMm * k;
    const trimH = p.hMm * k;
    return {
      paper: paperKey, dpi, k, bleed,
      trimWMm: p.wMm, trimHMm: p.hMm,
      W: Math.round((p.wMm + bleed * 2) * k),
      H: Math.round((p.hMm + bleed * 2) * k),
      ox, oy, trimW, trimH,
      mm: v => v * k,
      // 仕上がり枠の左上を原点とした割合座標
      x: f => ox + trimW * f,
      y: f => oy + trimH * f,
      w: f => trimW * f,
      h: f => trimH * f,
      // 「A1で○mm」を基準に決めた寸法を、用紙が変わっても同じ見えになるよう
      // 相似比で縮める。ただし下限（minMm）を切らない ―― A2でQRが29%小さくなって
      // 読めなくなる、コピーライトが細って判読できなくなる、を防ぐため。
      scaled: (a1Mm, minMm) => {
        const v = a1Mm * (p.wMm / PAPERS.A1.wMm);
        return Math.max(minMm == null ? 0 : minMm, v) * k;
      }
    };
  }

  function pixelSize(paperKey, dpi, bleedMm) {
    const g = geometry(paperKey, dpi, bleedMm);
    return { w: g.W, h: g.H, area: g.W * g.H };
  }

  // 入稿用のトンボ。仕上がり線の外側に、塗り足しぶんだけ伸ばした角のL字を描く。
  // 塗り足しが0のときは描きようがないので何もしない。
  function drawTrimMarks(ctx, g, color) {
    if (g.bleed <= 0) return;
    const len = Math.min(g.mm(g.bleed), g.mm(6));
    const lw = Math.max(1, g.mm(0.15));
    ctx.save();
    ctx.strokeStyle = color || '#000';
    ctx.lineWidth = lw;
    ctx.setLineDash([]);
    const corners = [
      [g.ox, g.oy, -1, -1],
      [g.ox + g.trimW, g.oy, 1, -1],
      [g.ox, g.oy + g.trimH, -1, 1],
      [g.ox + g.trimW, g.oy + g.trimH, 1, 1]
    ];
    corners.forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x + sx * g.mm(1), y);
      ctx.lineTo(x + sx * (g.mm(1) + len), y);
      ctx.moveTo(x, y + sy * g.mm(1));
      ctx.lineTo(x, y + sy * (g.mm(1) + len));
      ctx.stroke();
    });
    ctx.restore();
  }

  // 安全マージンのガイド。画面確認用で、書き出しには絶対に載せない
  // （版に線が乗ると入稿事故になるため、呼び出し側で必ずプレビュー限定にする）。
  function drawSafeGuide(ctx, g, marginMm) {
    const m = g.mm(marginMm);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,77,109,0.55)';
    ctx.lineWidth = Math.max(1, g.mm(0.2));
    ctx.setLineDash([g.mm(4), g.mm(3)]);
    ctx.strokeRect(g.ox + m, g.oy + m, g.trimW - m * 2, g.trimH - m * 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(77,163,255,0.6)';
    ctx.strokeRect(g.ox, g.oy, g.trimW, g.trimH);
    ctx.restore();
  }

  GAAAT.print = {
    PAPERS, PREVIEW_LONG_EDGE_PX, SAFARI_MAX_CANVAS_AREA,
    previewDpi, geometry, pixelSize, drawTrimMarks, drawSafeGuide
  };
})(window);
