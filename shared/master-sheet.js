/* GAAAT 共通：案件マスタ（スプレッドシート）のパース
 *
 * 案件マスタはフラットな表ではない。1タブの中に
 *   「案件基本情報」ブロック（企画タイトル・コピーライト、1回だけ）
 *   → 「会期／巡回情報」ブロック（PJコード・会場・開始日…）が都市の数だけ繰り返し
 * という形で入っている。列の位置ではなく**見出しの文字**で拾うので、
 * セル結合や、1都市ぶんだけコピーした貼り付けでも通る。
 * app.js の同名関数群をそのまま切り出したもの（挙動は変えていない）。
 */
(function (global) {
  const GAAAT = global.GAAAT || (global.GAAAT = {});

  const BASIC_INFO_LABELS = { title: '企画タイトル', copyright: 'コピーライト' };
  const SESSION_LABELS = {
    pjCode: 'PJコード', order: '開催順序', city: '開催都市',
    venue: '会場名', dateStart: '開始日', dateEnd: '終了日'
  };

  function findValueInRow(cells, label) {
    const idx = cells.findIndex(c => (c || '').trim() === label);
    if (idx === -1) return null;
    for (let i = idx + 1; i < cells.length; i++) {
      if (cells[i] && cells[i].trim()) return cells[i].trim();
    }
    return null;
  }

  function toIsoDate(raw) {
    if (!raw) return '';
    const m = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!m) return '';
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }

  function parseGrid(text) {
    const rows = text.split(/\r?\n/).map(line => line.split('\t'));
    const basic = {};
    const sessions = [];
    let current = null;

    for (const cells of rows) {
      for (const [key, label] of Object.entries(BASIC_INFO_LABELS)) {
        if (!basic[key]) {
          const v = findValueInRow(cells, label);
          if (v) basic[key] = v;
        }
      }
      // PJコードの行が来たら「次の会期ブロックが始まった」とみなす。
      const pjCode = findValueInRow(cells, SESSION_LABELS.pjCode);
      if (pjCode) {
        current = { pjCode };
        sessions.push(current);
        continue;
      }
      if (!current) continue;
      for (const [key, label] of Object.entries(SESSION_LABELS)) {
        if (key === 'pjCode' || current[key]) continue;
        const v = findValueInRow(cells, label);
        if (v) current[key] = v;
      }
    }
    return { basic, sessions };
  }

  // 会期の生の日付と会場名まで含めるので、一括生成のチェックリストが
  // 「何が出てくるか」の目視確認も兼ねる。
  function sessionLabel(s, i) {
    const head = [s.order, s.city, s.pjCode].filter(Boolean).join(' ') || `会場 ${i + 1}`;
    const dateRange = [s.dateStart, s.dateEnd].filter(Boolean).join('〜');
    const details = [dateRange, s.venue].filter(Boolean).join(' / ');
    return details ? `${head}（${details}）` : head;
  }

  function extractSheetsInfo(input) {
    const s = (input || '').trim();
    const idMatch = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return null;
    const gidMatch = s.match(/[#&]gid=(\d+)/);
    return { spreadsheetId: idMatch[1], gid: gidMatch ? gidMatch[1] : null };
  }

  GAAAT.master = {
    BASIC_INFO_LABELS, SESSION_LABELS,
    findValueInRow, toIsoDate, parseGrid, sessionLabel, extractSheetsInfo
  };
})(window);
