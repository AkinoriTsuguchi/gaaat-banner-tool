/* GAAAT 入稿チェック（判定側）
 *
 * Illustrator の preflight.jsx が出した「事実」のJSONを読み、
 * 期待サイズ・ECサイトのシートの価格と突き合わせて合否を出す。
 *
 * 判定をこちら側に置いているのは、案件ごとに違う値（サイズ・金額）を
 * JSXに書かせないため。JSXに数値を持たせると、前の案件の値のまま
 * チェックが通る事故が必ず起きる。
 *
 * 金額の抽出も、JSXが出した moneyStrings ではなく **こちらで texts を
 * 拾い直す**。抽出ルールを直したくなったとき、デザイナーやマーケ各人の
 * Macに配ったJSXを配り直さずに済むため（JSXは生テキストを運ぶだけ）。
 */
(function () {
  'use strict';

  // 記号が先に来る形（¥12,000）と後に来る形（12,000円）の両方。全角数字も拾う。
  // 旧 入稿チェック_v2.jsx は前者を取りこぼしていた。
  const MONEY_RE = /(?:[¥￥\\]\s*[0-9０-９][0-9０-９,，]*)|(?:[0-9０-９][0-9０-９,，]*\s*円)/g;

  const els = {};
  const state = {
    report: null,
    priceSet: null,      // Set<number>
    priceSource: '',
    projects: [],
    folderId: null,
    signedIn: false
  };

  /* ---------------- 金額の正規化 ---------------- */

  function toHalfWidth(s) {
    return String(s)
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[，]/g, ',')
      .replace(/[￥]/g, '¥');
  }

  // 「¥12,000」「12,000円（税込）」「12000」→ 12000
  // 数字が1桁も無ければ null。桁が異常に多いものは金額ではないとみなす。
  function normalizeMoney(raw) {
    const digits = toHalfWidth(raw).replace(/[^0-9]/g, '');
    if (!digits) return null;
    if (digits.length > 9) return null;
    return Number(digits);
  }

  function formatYen(n) {
    return '¥' + Number(n).toLocaleString('ja-JP');
  }

  /* ---------------- シートから価格の集合をつくる ---------------- */

  // 列の位置ではなく見出しの文字で価格列を探す（既存3ツールと同じ作法）。
  // ここで作るのは「載っていてよい金額」の許容集合なので、多少余分に拾っても
  // 実害は小さい。逆に取りこぼすと正しい金額をNGにしてしまうため、広めに取る。
  function buildPriceSet(text) {
    const rows = String(text || '').split(/\r?\n/).map(l => l.split('\t'));
    const priceCols = new Set();
    const values = new Set();
    let headerSeen = false;

    rows.forEach(cells => {
      // 見出し行を見つけるたびに価格列を足す。1タブに表が複数あっても通る。
      let isHeaderRow = false;
      cells.forEach((cell, idx) => {
        const h = String(cell || '').replace(/[\s　]/g, '');
        if (/価格|金額|price/i.test(h)) { priceCols.add(idx); isHeaderRow = true; }
      });
      if (isHeaderRow) { headerSeen = true; return; }
      if (!headerSeen) return;
      priceCols.forEach(idx => {
        const cell = cells[idx];
        if (cell === undefined) return;
        // 「12,000円」「¥12,000」「12000」だけを通す。「要問合せ」等は落とす。
        const cleaned = toHalfWidth(cell).replace(/[¥,\s　円-]/g, '');
        if (!/^[0-9]+$/.test(cleaned)) return;
        const n = normalizeMoney(cell);
        if (n !== null && n > 0) values.add(n);
      });
    });
    return values;
  }

  function parseExtraPrices(input) {
    const out = new Set();
    String(input || '').split(/[,、\s]+/).forEach(part => {
      const n = normalizeMoney(part);
      if (n !== null && n > 0) out.add(n);
    });
    return out;
  }

  /* ---------------- 誌面から金額を拾う ---------------- */

  function extractMoneyFromTexts(texts) {
    const found = [];
    (texts || []).forEach(t => {
      const line = String(t);
      let m;
      MONEY_RE.lastIndex = 0;
      while ((m = MONEY_RE.exec(line)) !== null) {
        const value = normalizeMoney(m[0]);
        if (value === null || value <= 0) continue;
        found.push({ raw: m[0], value, context: line.length > 60 ? line.slice(0, 60) + '…' : line });
      }
    });
    return found;
  }

  /* ---------------- Drive から入稿フォルダを読む ----------------
   * ファイル一覧と更新日時だけで判定できるのは「ペアが揃っているか」と
   * 「[ol前] が [ol後] より新しくないか」の2つ。425MB の .ai をブラウザに
   * 落とすことはできないので、中身を見る4項目は Illustrator に任せる。
   */

  const SKIP_SUBFOLDERS = /^(old|旧|bak|backup|archive|アーカイブ|過去)$/i;

  async function driveList(folderId) {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime)');
    const res = await GAAAT.google.apiFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200` +
      '&supportsAllDrives=true&includeItemsFromAllDrives=true');
    return (await res.json()).files || [];
  }

  async function driveMeta(fileId) {
    const res = await GAAAT.google.apiFetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}` +
      '?fields=id,name,parents&supportsAllDrives=true');
    return res.json();
  }

  // Illustrator のフォルダ選択でどこを辿ればいいかを出すために、親を上までたどる。
  // マイドライブに置いたショートカット経由で Finder からも同じ並びで辿れる。
  async function drivePath(folderId) {
    const names = [];
    let id = folderId;
    for (let i = 0; i < 12 && id; i++) {
      const m = await driveMeta(id);
      names.unshift(m.name);
      id = (m.parents && m.parents[0]) || null;
    }
    return names;
  }

  // 深い階層を人にたどらせないための入口。Drive の検索は1リクエストで
  // ドライブ全体を引けるので、フォルダを1つずつ開いて掘るより桁違いに速い
  // （フォルダを開く方式は実測で1件0.5秒。上の階層から掘ると案件に届かない）。
  async function searchProjects() {
    const q = encodeURIComponent(
      "name contains '[ol前]' and trashed = false and " +
      "mimeType != 'application/vnd.google-apps.folder'");
    const fields = encodeURIComponent('files(id,name,parents,modifiedTime)');
    const res = await GAAAT.google.apiFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}` +
      '&orderBy=modifiedTime desc&pageSize=200' +
      '&supportsAllDrives=true&includeItemsFromAllDrives=true');
    const all = (await res.json()).files || [];
    const files = all.filter(f => /\.ai$/i.test(f.name));

    // 案件名でまとめる。親フォルダで束ねると、old/ の中の同名ファイルが
    // 別フォルダとして数えられ、同じ案件が2度3度並ぶ（実データで確認済み）。
    // 同名が複数あるときは更新が最新のものを採る＝現物側になる。
    const byLabel = new Map();
    files.forEach(f => {
      const parent = f.parents && f.parents[0];
      if (!parent) return;
      const label = f.name.replace('[ol前]', '').replace(/\.ai$/i, '');
      const prev = byLabel.get(label);
      if (prev && new Date(prev.modifiedTime) >= new Date(f.modifiedTime)) return;
      byLabel.set(label, { parentId: parent, label, modifiedTime: f.modifiedTime });
    });
    const list = Array.from(byLabel.values())
      .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

    // .ai が無くPDFだけの案件は一覧に出せない（チェックは .ai の中身を読むため）。
    // 黙って消すと「あの案件が出てこない」になるので、件数だけ伝える。
    const pdfOnly = new Set();
    all.forEach(f => {
      if (/\.ai$/i.test(f.name)) return;
      const label = f.name.replace('[ol前]', '').replace(/\.[^.]+$/, '');
      if (!byLabel.has(label)) pdfOnly.add(label);
    });
    list.pdfOnlyCount = pdfOnly.size;
    return list;
  }

  // Finder / Illustrator のフォルダ選択にそのまま貼れる絶対パスを組み立てる。
  // マイドライブ直下に GAAAT のショートカットを置いてある前提。
  async function localPathFor(pathNames) {
    let email = '';
    try {
      const res = await GAAAT.google.apiFetch(
        'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
      email = ((await res.json()).user || {}).emailAddress || '';
    } catch (e) { /* 取れなくてもDrive上の経路は出す */ }
    if (!email) return null;
    return '~/Library/CloudStorage/GoogleDrive-' + email + '/マイドライブ/' + pathNames.join('/');
  }

  // Illustrator が書き出した結果はドライブ上のフォルダに入る。同期されていれば
  // API で直接読めるので、ファイルを人が探してドラッグする必要はない。
  async function fetchResultJson(folderId) {
    const q = encodeURIComponent(
      `'${folderId}' in parents and name = '_入稿チェック結果.json' and trashed = false`);
    const res = await GAAAT.google.apiFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)` +
      '&supportsAllDrives=true&includeItemsFromAllDrives=true');
    const files = (await res.json()).files || [];
    if (!files.length) return null;
    const dl = await GAAAT.google.apiFetch(
      `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media&supportsAllDrives=true`);
    return { text: await dl.text(), modifiedTime: files[0].modifiedTime };
  }

  function pickLatestByModified(files) {
    return files.slice().sort((a, b) =>
      new Date(b.modifiedTime) - new Date(a.modifiedTime))[0];
  }

  async function loadFolder(folderId) {
    const files = await driveList(folderId);
    const ai = files.filter(f => /\.ai$/i.test(f.name));
    const pre = ai.filter(f => f.name.indexOf('[ol前]') !== -1);
    const post = ai.filter(f => f.name.indexOf('[ol後]') !== -1);
    const subs = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const warnings = [];

    if (pre.length > 1) warnings.push('[ol前] の .ai が ' + pre.length + ' 件あります。更新日時が最新のものを使いました。');
    if (post.length > 1) warnings.push('[ol後] の .ai が ' + post.length + ' 件あります。更新日時が最新のものを使いました。');
    subs.forEach(sub => {
      if (SKIP_SUBFOLDERS.test(sub.name)) {
        warnings.push('サブフォルダ「' + sub.name + '」の中は見ていません（同名の旧版が入っていて現物を決められないため）。');
      }
    });

    const p = pre.length ? pickLatestByModified(pre) : null;
    const q = post.length ? pickLatestByModified(post) : null;

    const toEntry = (f, role) => f && {
      role, fileName: f.name,
      fileSizeBytes: Number(f.size || 0),
      modified: String(f.modifiedTime).replace('.000Z', '').replace('Z', '')
    };

    const report = {
      tool: 'gaaat-preflight', source: 'drive',
      checkedAt: new Date().toISOString().slice(0, 19),
      folderName: '', warnings,
      files: {}
    };
    if (p) report.files.pre = toEntry(p, 'pre');
    if (q) report.files.post = toEntry(q, 'post');
    if (p && q) {
      report.preModified = report.files.pre.modified;
      report.postModified = report.files.post.modified;
      report.preIsNewerThanPost = new Date(p.modifiedTime) > new Date(q.modifiedTime);
    }
    return { report, files, ai };
  }

  /* ---------------- 判定 ---------------- */

  function sizeMatches(w, h, ew, eh, tol, allowRotate) {
    const fits = (a, b, ea, eb) => Math.abs(a - ea) <= tol && Math.abs(b - eb) <= tol;
    if (fits(w, h, ew, eh)) return true;
    if (allowRotate && fits(w, h, eh, ew)) return true;
    return false;
  }

  function evaluate() {
    const r = state.report;
    if (!r) return [];

    const opts = {
      ew: Number(els.expW.value),
      eh: Number(els.expH.value),
      tol: Number(els.tolMm.value),
      allowRotate: els.allowRotate.checked,
      bleed: Number(els.bleedMm.value)
    };

    const pre = r.files && r.files.pre;
    const post = r.files && r.files.post;
    const fromDrive = r.source === 'drive';
    // .ai の中身を読まないと分からない項目。Illustrator を走らせるまで未判定にする
    // （データが無いのを「0件＝OK」と読んでしまうと、一番危ない誤判定になる）。
    const needsAi = msg => ({ status: 'info', title: msg, detail: 'Illustrator でスクリプトを実行すると判定できます（手順2）。' });
    const checks = [];
    const both = [];
    if (pre) both.push({ label: '[ol前]', f: pre });
    if (post) both.push({ label: '[ol後]', f: post });

    /* 1. ペアが揃っているか */
    if (pre && post) {
      checks.push({ status: 'ok', title: 'ファイルのペア', detail: '[ol前] と [ol後] が揃っています。' });
    } else {
      checks.push({
        status: 'ng', title: 'ファイルのペア',
        detail: (pre ? '[ol後]' : '[ol前]') + ' の .ai がフォルダ直下に見つかりませんでした。',
        lines: ['サブフォルダ（old など）の中は、同名ファイルが何世代も入っていて現物を決められないため、あえて見ていません。']
      });
    }

    /* 2. [ol前] と [ol後] の前後関係 */
    if (pre && post) {
      if (r.preIsNewerThanPost) {
        checks.push({
          status: 'ng', title: 'ファイルの新しさ',
          detail: '[ol前] のほうが [ol後] より新しくなっています。アウトライン化のあとに [ol前] を直して、[ol後] を作り直していない可能性があります。',
          lines: ['[ol前] ' + r.preModified, '[ol後] ' + r.postModified]
        });
      } else {
        checks.push({
          status: 'ok', title: 'ファイルの新しさ',
          detail: '[ol後] のほうが新しく、正しい順序です。',
          lines: ['[ol前] ' + r.preModified, '[ol後] ' + r.postModified]
        });
      }
    }

    /* 3. アウトライン化（[ol後]） */
    if (fromDrive) {
      checks.push(needsAi('テキストのアウトライン化'));
    } else if (post) {
      if (post.liveTextCount === 0) {
        checks.push({
          status: 'ok', title: 'テキストのアウトライン化',
          detail: '[ol後] に生きたテキストはありません。',
          lines: ['シンボル定義内・配置EPS内のテキストはこの件数に含まれません。0件でも「絶対に無い」とは言い切れない点だけ留意してください。']
        });
      } else {
        checks.push({
          status: 'ng', title: 'テキストのアウトライン化',
          detail: '[ol後] にアウトライン化されていないテキストが ' + post.liveTextCount + ' 個あります。'
        });
      }
    }

    /* 4. 画像の埋め込み */
    if (fromDrive) checks.push(needsAi('画像の埋め込み'));
    const linkedAll = [];
    both.forEach(({ label, f }) => {
      const n = (f.linkedImages && f.linkedImages.count) || 0;
      if (n > 0) {
        ((f.linkedImages && f.linkedImages.names) || []).forEach(name => linkedAll.push(label + ' ' + name));
      }
    });
    if (fromDrive) { /* 上で未判定を出している */ }
    else if (linkedAll.length === 0) {
      checks.push({
        status: 'ok', title: '画像の埋め込み',
        detail: 'リンク状態の画像はありません（すべて埋め込み済み、または画像なし）。'
      });
    } else {
      checks.push({
        status: 'ng', title: '画像の埋め込み',
        detail: 'リンク状態の画像が ' + linkedAll.length + ' 個あります。埋め込んでください。',
        lines: linkedAll
      });
    }

    /* 5. 仕上がりサイズ（全アートボード）
       ノベルティのように決まった判型が無い制作物もあるので、「確認しない」を選べる。
       その場合もアートボードの実測値だけは出す（他の4項目は普通に判定される）。 */
    const skipSize = els.sizePreset.value === 'none';
    const sizeLines = [];
    let sizeNg = false;
    const sizeNotes = [];
    both.forEach(({ label, f }) => {
      (f.artboards || []).forEach(ab => {
        const ok = skipSize || sizeMatches(ab.widthMm, ab.heightMm, opts.ew, opts.eh, opts.tol, opts.allowRotate);
        if (!ok) sizeNg = true;
        sizeLines.push(
          (skipSize ? '・ ' : (ok ? '○ ' : '× ')) + label + ' アートボード' + (ab.index + 1) +
          '（' + (ab.name || '名前なし') + '）: ' + ab.widthMm + ' × ' + ab.heightMm + ' mm');
        if (!ok) {
          // アートボードを「仕上がり」ではなく「塗り足し＋トンボ込み」で作っている案件がある。
          // その場合ここは必ずNGになるので、寸法差から可能性を言っておく。
          const dw = ab.widthMm - opts.ew, dh = ab.heightMm - opts.eh;
          if (dw >= opts.bleed * 2 - 0.5 && dh >= opts.bleed * 2 - 0.5) {
            sizeNotes.push(label + ' アートボード' + (ab.index + 1) +
              ' は仕上がりより 幅+' + Math.round(dw * 10) / 10 + 'mm / 高さ+' + Math.round(dh * 10) / 10 +
              'mm 大きいので、アートボードが塗り足し・トンボ込みの寸法になっている可能性があります。');
          }
        }
      });
    });
    checks.push({
      status: (sizeLines.length === 0 || skipSize) ? 'info' : (sizeNg ? 'ng' : 'ok'),
      title: '仕上がりサイズ',
      detail: sizeLines.length === 0
        ? (fromDrive ? 'Illustrator でスクリプトを実行すると判定できます（手順2）。' : 'アートボードの情報がありません。')
        : skipSize
          ? 'サイズは確認しない設定です。実測値だけ出しています。'
          : '期待値 ' + opts.ew + ' × ' + opts.eh + ' mm（許容差 ±' + opts.tol + 'mm' +
            (opts.allowRotate ? '・縦横入れ替わり可' : '') + '）',
      lines: sizeLines.concat(sizeNotes)
    });

    /* 6. 塗り足し・トンボ */
    const bleedLines = [];
    let bleedNg = false;
    both.forEach(({ label, f }) => {
      (f.bleedByArtboard || []).forEach((b, i) => {
        if (!b) {
          bleedLines.push('？ ' + label + ' アートボード' + (i + 1) + ': アートボード上にオブジェクトが見つかりませんでした');
          return;
        }
        const sides = [b.topMm, b.rightMm, b.bottomMm, b.leftMm];
        const min = Math.min.apply(null, sides);
        const ok = min >= opts.bleed - 0.05;
        if (!ok) bleedNg = true;
        bleedLines.push((ok ? '○ ' : '× ') + label + ' アートボード' + (i + 1) +
          ': 上 ' + b.topMm + ' / 右 ' + b.rightMm + ' / 下 ' + b.bottomMm + ' / 左 ' + b.leftMm + ' mm');
      });
      if (f.tomboLayerNameHit) {
        bleedLines.push('（参考）' + label + ' にトンボらしき名前のレイヤーがあります。');
      }
    });
    checks.push({
      status: bleedLines.length === 0 ? 'info' : (bleedNg ? 'ng' : 'ok'),
      title: '塗り足し・トンボ',
      detail: (bleedLines.length === 0 && fromDrive)
        ? 'Illustrator でスクリプトを実行すると判定できます（手順2）。'
        : 'アートボードの外にオブジェクトがどれだけ出ているかの実測値。' + opts.bleed + 'mm 以上あれば塗り足しありとみなします。',
      lines: bleedLines.length
        ? bleedLines.concat(['トンボそのものの位置・線幅までは判定していません。数値が極端に大きい場合はトンボ込みです。'])
        : []
    });

    /* 7. 金額 */
    if (fromDrive) {
      checks.push(needsAi('金額'));
    } else if (!pre) {
      checks.push({ status: 'info', title: '金額', detail: '[ol前] が無いため、金額は確認できません（アウトライン後は文字を読めません）。' });
    } else if (!state.priceSet) {
      checks.push({ status: 'info', title: '金額', detail: '手順3で正しい金額を読み込むと、ここで突き合わせます。' });
    } else {
      const allow = new Set(state.priceSet);
      parseExtraPrices(els.extraPrices.value).forEach(v => allow.add(v));
      const found = extractMoneyFromTexts(pre.texts);
      const bad = [];
      const seenOk = new Set();
      found.forEach(item => {
        if (allow.has(item.value)) seenOk.add(item.value);
        else bad.push(item);
      });
      if (found.length === 0) {
        checks.push({
          status: 'warn', title: '金額',
          detail: '[ol前] の中に金額らしき文字列が1つも見つかりませんでした。誌面に金額が載る案件なら、テキストが既にアウトライン化されている可能性があります。'
        });
      } else if (bad.length === 0) {
        checks.push({
          status: 'ok', title: '金額',
          detail: '誌面の金額 ' + found.length + ' 件（種類は ' + seenOk.size + ' 通り）は、すべてシートの価格に含まれています。',
          lines: Array.from(seenOk).sort((a, b) => a - b).map(formatYen)
        });
      } else {
        const uniq = new Map();
        bad.forEach(b => { if (!uniq.has(b.value)) uniq.set(b.value, b); });
        checks.push({
          status: 'ng', title: '金額',
          detail: 'シートの価格に無い金額が ' + uniq.size + ' 種類あります（' + state.priceSource + ' と照合）。',
          lines: Array.from(uniq.values()).map(b => formatYen(b.value) + '  ← 「' + b.context + '」')
        });
      }
    }

    /* 8. カラーモード（5種の不備の外だが、入稿不備の定番なので出しておく） */
    const rgb = fromDrive ? [] : both.filter(({ f }) => f.documentColorSpace === 'RGB').map(({ label }) => label);
    if (rgb.length) {
      checks.push({
        status: 'warn', title: 'カラーモード',
        detail: rgb.join(' / ') + ' が RGB になっています。印刷用は通常 CMYK です。'
      });
    }

    return checks;
  }

  /* ---------------- 表示 ---------------- */

  const TAGS = { ok: 'OK', ng: 'NG', warn: '要確認', info: '未判定' };

  function render() {
    const box = els.results;
    box.textContent = '';
    if (!state.report) return;

    const checks = evaluate();
    const ngCount = checks.filter(c => c.status === 'ng').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;

    const verdict = document.createElement('div');
    verdict.className = 'verdict ' + (ngCount ? 'ng' : 'ok');
    const h2 = document.createElement('h2');
    h2.textContent = ngCount ? '不備あり（' + ngCount + '件）' : '主要項目 OK';
    verdict.appendChild(h2);
    const p = document.createElement('p');
    p.textContent = (state.report.folderName || '') +
      (warnCount ? ' ／ 要確認 ' + warnCount + '件' : '') +
      ' ／ チェック日時 ' + (state.report.checkedAt || '');
    verdict.appendChild(p);
    box.appendChild(verdict);

    (state.report.warnings || []).forEach(w => {
      checks.unshift({ status: 'warn', title: 'スクリプトからの注意', detail: w });
    });

    checks.forEach(c => {
      const el = document.createElement('div');
      el.className = 'check ' + c.status;
      const head = document.createElement('div');
      head.className = 'head';
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = TAGS[c.status] || '';
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = c.title;
      head.appendChild(tag); head.appendChild(title);
      el.appendChild(head);
      if (c.detail) {
        const d = document.createElement('div');
        d.className = 'detail';
        d.textContent = c.detail;
        el.appendChild(d);
      }
      if (c.lines && c.lines.length) {
        const ul = document.createElement('ul');
        c.lines.forEach(line => {
          const li = document.createElement('li');
          li.textContent = line;
          ul.appendChild(li);
        });
        el.appendChild(ul);
      }
      box.appendChild(el);
    });

    const row = document.createElement('div');
    row.className = 'btn-row';
    const copy = document.createElement('button');
    copy.textContent = '結果をテキストでコピー';
    copy.addEventListener('click', () => {
      const lines = [];
      lines.push('■ 入稿チェック: ' + (ngCount ? '不備あり（' + ngCount + '件）' : '主要項目OK'));
      lines.push('案件: ' + (state.report.folderName || ''));
      lines.push('');
      checks.forEach(c => {
        lines.push('[' + (TAGS[c.status] || '') + '] ' + c.title + (c.detail ? ' — ' + c.detail : ''));
        (c.lines || []).forEach(l => lines.push('    ' + l));
      });
      navigator.clipboard.writeText(lines.join('\n')).then(
        () => { copy.textContent = 'コピーしました'; setTimeout(() => { copy.textContent = '結果をテキストでコピー'; }, 1600); },
        () => { copy.textContent = 'コピーできませんでした'; }
      );
    });
    row.appendChild(copy);
    box.appendChild(row);
  }

  /* ---------------- 読み込み ---------------- */

  function loadReport(text, fileName) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      els.loaded.textContent = '読み込めませんでした。preflight.jsx が出した _入稿チェック結果.json を選んでください。';
      return;
    }
    if (!data || data.tool !== 'gaaat-preflight') {
      els.loaded.textContent = 'このJSONは入稿チェックの結果ファイルではないようです。';
      return;
    }
    state.report = data;
    const names = [];
    if (data.files && data.files.pre) names.push(data.files.pre.fileName);
    if (data.files && data.files.post) names.push(data.files.post.fileName);
    els.loaded.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = data.folderName || fileName;
    els.loaded.appendChild(b);
    els.loaded.appendChild(document.createTextNode('　' + names.join(' / ')));
    render();
  }

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = () => loadReport(String(reader.result), file.name);
    reader.readAsText(file, 'UTF-8');
  }

  /* ---------------- 起動 ---------------- */

  function setPriceSet(set, source) {
    if (!set || set.size === 0) {
      els.priceStatus.textContent = '価格を1件も読み取れませんでした。見出しに「価格」を含む列があるか確認してください。';
      els.priceStatus.className = 'status err';
      return;
    }
    state.priceSet = set;
    state.priceSource = source;
    els.priceStatus.className = 'status';
    els.priceStatus.textContent = source + ' から ' + set.size + ' 種類の価格を読み込みました。';
    render();
  }

  function initGoogle() {
    GAAAT.google.init({
      onSetupMessage: msg => { els.googleStatus.textContent = msg; },
      onReady: () => { els.btnSignIn.disabled = false; },
      onSignedIn: () => {
        state.signedIn = true;
        els.btnSignIn.textContent = 'ログイン済み';
        els.btnSignIn.disabled = true;
        els.btnLoadSheet.disabled = false;
        els.btnLoadFolder.disabled = false;
        els.btnFindProjects.disabled = false;
        els.googleStatus.className = 'status';
        els.googleStatus.textContent = 'ログインしました。「案件を一覧から選ぶ」を押すか、フォルダのURLを貼ってください。';
      },
      onSignedOut: () => {
        state.signedIn = false;
        els.btnSignIn.textContent = 'Googleにログイン';
        els.btnSignIn.disabled = false;
        els.btnLoadSheet.disabled = true;
        els.btnLoadFolder.disabled = true;
        els.btnFindProjects.disabled = true;
      },
      onError: msg => { els.googleStatus.className = 'status err'; els.googleStatus.textContent = msg; }
    });
  }

  function boot() {
    ['drop', 'filePicker', 'loaded', 'sizePreset', 'expW', 'expH', 'tolMm', 'allowRotate',
     'bleedMm', 'tabSheet', 'tabPaste', 'paneSheet', 'panePaste', 'btnSignIn', 'sheetUrl',
     'btnLoadSheet', 'googleStatus', 'sheetStatus', 'pasteArea', 'btnLoadPaste', 'extraPrices',
     'priceStatus', 'results', 'folderUrl', 'btnLoadFolder', 'folderInfo', 'btnFindProjects', 'projectList', 'projectFilter']
      .forEach(id => { els[id] = document.getElementById(id); });

    els.drop.addEventListener('click', () => els.filePicker.click());
    els.filePicker.addEventListener('change', () => {
      if (els.filePicker.files[0]) readFile(els.filePicker.files[0]);
    });
    ['dragenter', 'dragover'].forEach(ev => els.drop.addEventListener(ev, e => {
      e.preventDefault(); els.drop.classList.add('over');
    }));
    ['dragleave', 'drop'].forEach(ev => els.drop.addEventListener(ev, e => {
      e.preventDefault(); els.drop.classList.remove('over');
    }));
    els.drop.addEventListener('drop', e => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) readFile(file);
    });

    els.sizePreset.addEventListener('change', () => {
      const v = els.sizePreset.value;
      const off = (v === 'none');
      [els.expW, els.expH, els.tolMm, els.allowRotate].forEach(el => { el.disabled = off; });
      if (v !== 'custom' && !off) {
        const [w, h] = v.split('x');
        els.expW.value = w; els.expH.value = h;
      }
      render();
    });
    ['expW', 'expH'].forEach(id => els[id].addEventListener('input', () => {
      // 手で寸法を変えたらプルダウンの表示と食い違うので、「自分で入力する」に寄せる。
      if (els.sizePreset.value !== 'none') els.sizePreset.value = 'custom';
      render();
    }));
    ['tolMm', 'bleedMm', 'extraPrices'].forEach(id =>
      els[id].addEventListener('input', render));
    els.allowRotate.addEventListener('change', render);

    els.tabSheet.addEventListener('click', () => {
      els.tabSheet.classList.add('on'); els.tabPaste.classList.remove('on');
      els.paneSheet.classList.add('on'); els.panePaste.classList.remove('on');
    });
    els.tabPaste.addEventListener('click', () => {
      els.tabPaste.classList.add('on'); els.tabSheet.classList.remove('on');
      els.panePaste.classList.add('on'); els.paneSheet.classList.remove('on');
    });

    els.btnSignIn.disabled = true;
    els.btnSignIn.addEventListener('click', () => {
      GAAAT.google.requestSignIn((msg, isErr) => {
        els.googleStatus.className = 'status' + (isErr ? ' err' : '');
        els.googleStatus.textContent = msg;
      });
    });

    els.btnLoadSheet.addEventListener('click', async () => {
      const info = GAAAT.master.extractSheetsInfo(els.sheetUrl.value);
      if (!info) {
        els.sheetStatus.className = 'status err';
        els.sheetStatus.textContent = 'スプレッドシートのURLを入れてください（.../spreadsheets/d/… の形）。';
        return;
      }
      els.sheetStatus.className = 'status';
      els.sheetStatus.textContent = 'シートを読み込んでいます…';
      try {
        // ECサイトのシートは行も列も多いので、既定の A1:Z300 では価格列に届かない。
        const { sheetTitle, text } = await GAAAT.google.fetchSheetText(
          info.spreadsheetId, info.gid, 'A1:BZ2000');
        els.sheetStatus.textContent = 'シート「' + sheetTitle + '」を読みました。';
        setPriceSet(buildPriceSet(text), 'シート「' + sheetTitle + '」');
      } catch (e) {
        els.sheetStatus.className = 'status err';
        els.sheetStatus.textContent = String(e.message || e);
      }
    });

    els.btnLoadPaste.addEventListener('click', () => {
      setPriceSet(buildPriceSet(els.pasteArea.value), '貼り付けたシート');
    });

    async function openFolder(id) {
      els.googleStatus.className = 'status';
      els.googleStatus.textContent = 'フォルダを読んでいます…';
      els.btnLoadFolder.disabled = true;
      try {
        const { report, files, ai } = await loadFolder(id);
        const path = await drivePath(id);
        report.folderName = path[path.length - 1] || '';
        state.report = report;
        state.folderId = id;
        renderFolderInfo(path, files, ai, await localPathFor(path));
        els.googleStatus.textContent = 'フォルダを読みました。';
        render();
      } catch (e) {
        els.googleStatus.className = 'status err';
        els.googleStatus.textContent = String(e.message || e);
      } finally {
        els.btnLoadFolder.disabled = !state.signedIn;
      }
    }

    els.btnLoadFolder.addEventListener('click', () => {
      const id = GAAAT.google.extractDriveFolderId(els.folderUrl.value);
      if (!id) {
        els.googleStatus.className = 'status err';
        els.googleStatus.textContent = '入稿フォルダのURLを入れてください（.../drive/folders/… の形）。';
        return;
      }
      openFolder(id);
    });

    // 絞り込みは読み込み済みの一覧に対してその場でかける（再検索はしない）。
    // 依頼ID（R268）でも案件名の一部でも引けるように、単純な部分一致にしてある。
    function renderProjects() {
      const q = els.projectFilter.value.trim().toLowerCase();
      const hits = q
        ? state.projects.filter(pj => pj.label.toLowerCase().indexOf(q) !== -1)
        : state.projects;

      els.projectList.textContent = '';
      const h = document.createElement('h4');
      h.textContent = q
        ? '「' + els.projectFilter.value.trim() + '」に一致 ' + hits.length + ' 件'
        : '更新が新しい順（' + hits.length + '件）。選ぶとそのフォルダを読みます。';
      els.projectList.appendChild(h);

      if (!q && state.projects.pdfOnlyCount) {
        const n = document.createElement('h4');
        n.textContent = 'PDFしか無い案件 ' + state.projects.pdfOnlyCount +
          ' 件は出していません（チェックには .ai が要ります）。';
        els.projectList.appendChild(n);
      }

      if (!hits.length) {
        const b = document.createElement('h4');
        b.textContent = '一致する案件がありません。依頼ID（R268 など）か案件名の一部で試してください。';
        els.projectList.appendChild(b);
        return;
      }
      hits.forEach(pj => {
        const b = document.createElement('button');
        b.className = 'proj';
        b.textContent = pj.label;
        const small = document.createElement('small');
        small.textContent = '更新 ' + String(pj.modifiedTime).slice(0, 10);
        b.appendChild(small);
        b.addEventListener('click', () => {
          els.projectList.textContent = '';
          els.projectFilter.hidden = true;
          openFolder(pj.parentId);
        });
        els.projectList.appendChild(b);
      });
    }

    els.projectFilter.addEventListener('input', renderProjects);

    els.btnFindProjects.addEventListener('click', async () => {
      els.googleStatus.className = 'status';
      els.googleStatus.textContent = '案件を探しています…';
      els.btnFindProjects.disabled = true;
      try {
        state.projects = await searchProjects();
        if (!state.projects.length) {
          els.projectList.textContent = '';
          els.projectFilter.hidden = true;
          els.googleStatus.textContent = '[ol前] の .ai が見つかりませんでした。';
          return;
        }
        els.projectFilter.hidden = false;
        els.projectFilter.value = '';
        renderProjects();
        els.projectFilter.focus();
        els.googleStatus.textContent = '案件が ' + state.projects.length + ' 件見つかりました。絞り込めます。';
      } catch (e) {
        els.googleStatus.className = 'status err';
        els.googleStatus.textContent = String(e.message || e);
      } finally {
        els.btnFindProjects.disabled = !state.signedIn;
      }
    });

    initGoogle();
  }

  // Illustrator のフォルダ選択でどこを辿ればいいかを出す。
  // ここが分からないのが「面倒くささ」の実体なので、経路をそのまま見せる。
  function renderFolderInfo(path, files, ai, localPath) {
    const box = els.folderInfo;
    box.textContent = '';

    const h = document.createElement('h4');
    h.textContent = 'Illustrator のフォルダ選択では、ここを辿ってください';
    box.appendChild(h);

    const crumb = document.createElement('div');
    crumb.className = 'crumb';
    crumb.appendChild(document.createTextNode('マイドライブ / '));
    path.forEach((name, i) => {
      if (i === path.length - 1) {
        const b = document.createElement('b');
        b.textContent = name;
        crumb.appendChild(b);
      } else {
        crumb.appendChild(document.createTextNode(name + ' / '));
      }
    });
    box.appendChild(crumb);

    const ul = document.createElement('ul');
    ai.forEach(f => {
      const li = document.createElement('li');
      const mb = Math.round(Number(f.size || 0) / 1048576);
      li.textContent = f.name + (mb ? '（' + mb + ' MB）' : '');
      ul.appendChild(li);
    });
    if (!ai.length) {
      const li = document.createElement('li');
      li.textContent = 'このフォルダの直下に .ai がありません。';
      ul.appendChild(li);
    }
    box.appendChild(ul);

    if (localPath) {
      const lp = document.createElement('div');
      lp.className = 'localpath';
      lp.textContent = localPath;
      box.appendChild(lp);

      const copy = document.createElement('button');
      copy.className = 'copy';
      copy.textContent = 'このパスをコピー';
      copy.addEventListener('click', () => {
        navigator.clipboard.writeText(localPath).then(
          () => {
            copy.textContent = 'コピーしました';
            setTimeout(() => { copy.textContent = 'このパスをコピー'; }, 1600);
          },
          () => { copy.textContent = 'コピーできませんでした'; });
      });
      box.appendChild(copy);
    }

    // 選んだあと何をすればいいのかが分からない、という声があったので、
    // 次の操作をここに置く。結果はページ下部に出るため気づかれにくい。
    const next = document.createElement('div');
    next.className = 'nextsteps';
    const nh = document.createElement('h4');
    nh.textContent = '次にやること';
    next.appendChild(nh);

    const ol = document.createElement('ol');
    [
      '下の「① Illustratorに渡す」を押す（指示ファイルが1つ落ちてきます）',
      'Illustrator で ファイル → スクリプト → その他のスクリプト... → preflight.jsx',
      'このフォルダでいいか聞かれるので「はい」。あとは数分待つだけ' +
        '（.ai は自分で開かなくていい。スクリプトが開いて閉じます）',
      'このページに戻って「② 結果を取り込む」を押す'
    ].forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      ol.appendChild(li);
    });
    next.appendChild(ol);

    const row = document.createElement('div');
    row.className = 'nextbtns';

    // ① 対象フォルダをファイルに書き出す。JSXがダウンロードフォルダから拾うので、
    //    Illustrator 側でフォルダを選ぶ操作が丸ごと消える。
    const jobBtn = document.createElement('button');
    jobBtn.className = 'copy primary';
    jobBtn.textContent = '① Illustratorに渡す';
    jobBtn.disabled = !localPath;
    jobBtn.addEventListener('click', () => {
      const job = { folderPath: localPath, folderName: path[path.length - 1] || '',
                    createdAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gaaat-check-job.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      jobBtn.textContent = '① 渡しました';
      setTimeout(() => { jobBtn.textContent = '① Illustratorに渡す'; }, 2500);
    });
    row.appendChild(jobBtn);

    // ② 結果はドライブ側に書かれるので、そのまま読む。人がファイルを探さなくていい。
    const pullBtn = document.createElement('button');
    pullBtn.className = 'copy';
    pullBtn.textContent = '② 結果を取り込む';
    pullBtn.addEventListener('click', async () => {
      pullBtn.disabled = true;
      pullBtn.textContent = '探しています…';
      try {
        const found = await fetchResultJson(state.folderId);
        if (!found) {
          pullBtn.textContent = 'まだ結果がありません';
          setTimeout(() => { pullBtn.textContent = '② 結果を取り込む'; }, 2500);
          return;
        }
        loadReport(found.text, '_入稿チェック結果.json');
        pullBtn.textContent = '取り込みました';
        els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        pullBtn.textContent = String(e.message || e).slice(0, 40);
      } finally {
        pullBtn.disabled = false;
      }
    });
    row.appendChild(pullBtn);

    const jump = document.createElement('button');
    jump.className = 'copy';
    jump.textContent = 'いまの判定結果を見る';
    jump.addEventListener('click', () => {
      els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    row.appendChild(jump);
    next.appendChild(row);

    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'ペアの有無と新しさは、この時点でもう判定できています（ページ下部）。' +
      '残りの4項目は .ai の中身が要るので、Illustrator を1回だけ走らせてください。' +
      '結果がまだ出ないときは、ドライブの同期待ちです。少し置いてもう一度押してください。';
    next.appendChild(note);
    box.appendChild(next);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
