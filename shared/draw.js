/* GAAAT 共通：canvas描画ヘルパ（素材配置・テキスト・地色抽出）
 *
 * ここでいう「素材を触らない」とは、フィルタ・色調変換・自動切り抜きを
 * 一切かけないという意味。拡大縮小と、枠に合わせた表示範囲の指定（トリミング）
 * だけを行う。地色の読み取りは getImageData で「読むだけ」なので該当しない。
 */
(function (global) {
  const GAAAT = global.GAAAT || (global.GAAAT = {});

  function rgbStr(c) { return `rgb(${c.r},${c.g},${c.b})`; }
  function rgbToHex(c) {
    const h = v => Math.round(v).toString(16).padStart(2, '0');
    return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
  }
  function hexToRgb(hex) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function relLuminance({ r, g, b }) {
    const chan = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  }
  function contrastRatio(c1, c2) {
    const l1 = relLuminance(c1) + 0.05, l2 = relLuminance(c2) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  }
  // 地色に対して黒字・白字のどちらが読みやすいかを、コントラスト比で選ぶ。
  function pickTextColor(bg) {
    const black = { r: 17, g: 17, b: 17 }, white = { r: 255, g: 255, b: 255 };
    return contrastRatio(bg, black) >= contrastRatio(bg, white) ? black : white;
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // 枠に収める（余白が出る）。原画の全体を必ず見せたいときに使う。
  function fitBox(imgW, imgH, boxW, boxH) {
    const s = Math.min(boxW / imgW, boxH / imgH);
    const w = imgW * s, h = imgH * s;
    return { w, h, x: (boxW - w) / 2, y: (boxH - h) / 2, scale: s };
  }

  function drawContained(ctx, img, x, y, w, h) {
    const f = fitBox(img.width, img.height, w, h);
    ctx.drawImage(img, x + f.x, y + f.y, f.w, f.h);
    return { x: x + f.x, y: y + f.y, w: f.w, h: f.h };
  }

  /**
   * 枠を埋める（はみ出したぶんは表示されない＝トリミング）。
   * zoom/panX/panY で「どこを見せるか」を手で決められる。ポスターの
   * キービジュアルはフルブリードで使うのが前提なので、切れる位置は
   * 自動任せにせず必ず人が確認できるようにしている。
   * panX/panY は -1〜1（枠に対する相対位置）。
   */
  function drawCovered(ctx, img, x, y, w, h, zoom, panX, panY) {
    zoom = zoom || 1; panX = panX || 0; panY = panY || 0;
    const base = Math.max(w / img.width, h / img.height) * zoom;
    const dw = img.width * base, dh = img.height * base;
    const dx = x + (w - dw) / 2 + panX * (dw - w) / 2;
    const dy = y + (h - dh) / 2 + panY * (dh - h) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    return { x, y, w, h };
  }

  // 幅に収まるまで級数を下げる。ポスターは1要素の文字数が案件ごとに
  // 大きく変わるので、枠からはみ出させるくらいなら必ず縮める。
  function fitFontSize(ctx, text, maxWidth, startSize, fontTemplate, minSize) {
    let size = startSize;
    const min = minSize || startSize * 0.35;
    while (size > min) {
      ctx.font = fontTemplate.replace('{size}', String(Math.round(size)));
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= Math.max(1, size * 0.03);
    }
    ctx.font = fontTemplate.replace('{size}', String(Math.round(size)));
    return Math.round(size);
  }

  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    String(text).split('\n').forEach(paragraph => {
      if (!paragraph) { lines.push(''); return; }
      let line = '';
      // 和文は単語境界が無いので1文字ずつ送る。欧文もこれで破綻はしないが、
      // 単語の途中で折れないよう空白があればそこを優先する。
      const tokens = /[　-鿿＀-￯]/.test(paragraph)
        ? paragraph.split('')
        : paragraph.split(/(\s+)/);
      tokens.forEach(t => {
        const next = line + t;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line.trimEnd());
          line = t.trimStart();
        } else {
          line = next;
        }
      });
      lines.push(line);
    });
    return lines;
  }

  // 画像の周囲から地色を拾う。四隅と辺の中点が一様ならその色を返し、
  // ばらついていれば「読めない」として null を返す（白地に戻すのではなく
  // 呼び出し側で判断させるため）。素材そのものには一切触れない。
  function detectBackgroundColor(img) {
    const cv = document.createElement('canvas');
    const n = Math.min(256, Math.max(img.width, img.height));
    const sx = n / Math.max(img.width, img.height);
    cv.width = Math.max(1, Math.round(img.width * sx));
    cv.height = Math.max(1, Math.round(img.height * sx));
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    let d;
    try { d = cx.getImageData(0, 0, cv.width, cv.height); } catch (e) { return null; }
    const px = (x, y) => {
      const i = (clamp(y, 0, cv.height - 1) * cv.width + clamp(x, 0, cv.width - 1)) * 4;
      return [d.data[i], d.data[i + 1], d.data[i + 2]];
    };
    const w = cv.width - 1, h = cv.height - 1;
    const pts = [px(1, 1), px(w - 1, 1), px(1, h - 1), px(w - 1, h - 1), px(w >> 1, 1), px(1, h >> 1)];
    const avg = [0, 1, 2].map(k => pts.reduce((a, p) => a + p[k], 0) / pts.length);
    const spread = Math.max(...pts.map(p => Math.max(...[0, 1, 2].map(k => Math.abs(p[k] - avg[k])))));
    if (spread > 14) return null;
    return { r: Math.round(avg[0]), g: Math.round(avg[1]), b: Math.round(avg[2]) };
  }

  // 48pxに縮めた縮小版から、明るさと最大彩度、そして代表的なアクセント色を拾う。
  // ポスターの情報帯の地色・差し色の初期値に使う（あくまで初期値で、手で変えられる）。
  function samplePalette(img) {
    const n = 48;
    const cv = document.createElement('canvas');
    cv.width = n; cv.height = n;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, n, n);
    let data;
    try { data = cx.getImageData(0, 0, n, n).data; } catch (e) { return null; }
    let lum = 0, count = 0, bestSat = 0, accent = null;
    let sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 16) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      lum += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      sr += r; sg += g; sb += b;
      count++;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx > 0 ? (mx - mn) / mx : 0;
      if (sat > bestSat) { bestSat = sat; accent = { r, g, b }; }
    }
    if (!count) return null;
    return {
      brightness: lum / count,
      saturation: bestSat,
      average: { r: Math.round(sr / count), g: Math.round(sg / count), b: Math.round(sb / count) },
      accent: accent || { r: 226, g: 87, b: 76 }
    };
  }

  // 画像の一部分だけの明るさを測る。ポスターは文字が素材の下部に乗るので、
  // 画像全体ではなく「文字が乗る帯」の明るさで白黒を決めないと、
  // 上半分が明るく下半分が暗い絵で文字が読めなくなる。y0/y1 は0〜1の割合。
  function regionBrightness(img, y0, y1) {
    const n = 64;
    const cv = document.createElement('canvas');
    cv.width = n; cv.height = n;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, n, n);
    let data;
    try { data = cx.getImageData(0, 0, n, n).data; } catch (e) { return null; }
    const rowStart = Math.floor(clamp(y0, 0, 1) * n);
    const rowEnd = Math.ceil(clamp(y1, 0, 1) * n);
    let lum = 0, count = 0;
    for (let y = rowStart; y < rowEnd; y++) {
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        if (data[i + 3] < 16) continue;
        lum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        count++;
      }
    }
    return count ? lum / count : null;
  }

  GAAAT.draw = {
    rgbStr, rgbToHex, hexToRgb, relLuminance, contrastRatio, pickTextColor, clamp,
    fitBox, drawContained, drawCovered, fitFontSize, wrapText,
    detectBackgroundColor, samplePalette, regionBrightness
  };
})(window);
