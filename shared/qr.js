/* GAAAT 共通：QRコードの描画
 *
 * qrcode-generator（cdnjs）でモジュール行列だけを取り出し、矩形は自前で描く。
 * ライブラリが返すPNG/imgをそのまま拡大すると、150dpiでも300dpiでも
 * モジュールの境目がぼやけて読み取り率が落ちる。行列から描けば、
 * どのdpiでもピクセルにぴったり乗った完全に鮮鋭なQRになる。
 */
(function (global) {
  const GAAAT = global.GAAAT || (global.GAAAT = {});

  // 誤り訂正レベル。ポスターは汚れ・破れのリスクがあるので M（15%）を既定にする。
  const DEFAULT_EC = 'M';
  // 静穏域（クワイエットゾーン）。規格上4モジュール必要。
  const QUIET_MODULES = 4;

  function isAvailable() { return typeof global.qrcode === 'function'; }

  /**
   * x, y, size は「静穏域を含めた」外形。size をモジュール数で割り切れる値に
   * 丸めてから描くので、実際の描画サイズは size 以下になることがある。
   */
  function draw(ctx, text, x, y, size, opts) {
    opts = opts || {};
    if (!isAvailable()) throw new Error('QRコードライブラリ（qrcode-generator）を読み込めませんでした。');
    if (!text) return null;
    const qr = global.qrcode(0, opts.ec || DEFAULT_EC);
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const total = count + QUIET_MODULES * 2;
    // モジュール幅を整数pxに丸める。端数のままだとモジュールごとに
    // 幅が1px揺れて、印刷後の読み取りが不安定になる。
    const cell = Math.max(1, Math.floor(size / total));
    const drawn = cell * total;
    const ox = x + (size - drawn) / 2;
    const oy = y + (size - drawn) / 2;

    ctx.save();
    ctx.fillStyle = opts.bg || '#ffffff';
    ctx.fillRect(ox, oy, drawn, drawn);
    ctx.fillStyle = opts.fg || '#000000';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (!qr.isDark(r, c)) continue;
        ctx.fillRect(
          ox + (c + QUIET_MODULES) * cell,
          oy + (r + QUIET_MODULES) * cell,
          cell, cell);
      }
    }
    ctx.restore();
    return { x: ox, y: oy, w: drawn, h: drawn, modules: count, cell };
  }

  GAAAT.qr = { DEFAULT_EC, QUIET_MODULES, isAvailable, draw };
})(window);
