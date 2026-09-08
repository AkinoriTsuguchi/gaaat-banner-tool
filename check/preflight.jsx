/*
  GAAAT 入稿チェック（Illustrator側）  preflight.jsx
  ------------------------------------------------------------------
  入稿フォルダを選ぶと、その直下の [ol前] / [ol後] の .ai を自動で見つけて開き、
  「事実」だけを集めて _入稿チェック結果.json に書き出す。

  使い方:
    ファイル > スクリプト > その他のスクリプト... でこのファイルを選ぶ
    → 入稿フォルダを選ぶ → 終わるとJSONの場所が出る
    → そのJSONを check/ のページにドラッグ&ドロップすると合否が出る

  設計上の約束（ここを踏み外さないこと）:
    このスクリプトは **OK/NG を判定しない**。期待サイズも正しい金額も知らないから。
    サイズは「何mmだったか」、金額は「こういう文字列があった」までを出し、
    シートと突き合わせて合否を出すのはブラウザ側の仕事。
    こうしておくと、案件ごとに数値を書き換える必要がなくなる（＝前の案件の値のまま
    チェックが通る、という事故が起きない）。

  入稿チェック_v2.jsx から直したところ:
    - サイズを全アートボードで見る（旧版はアクティブな1枚だけ＝裏面が未検査だった）
    - 金額の正規表現が ¥12,000 と全角数字を拾えるようにした
    - トンボをレイヤー名だけで判定するのをやめ、塗り足しの実測値（mm）を出す
    - 結果を alert ではなくJSONに書く（テキストが数十件あると alert は読めない）
    - リンク画像は placedItems に加えて embedded でない rasterItems も見る
    - [ol前] が [ol後] より新しい場合を検出する（実データに事故が1件あった）
*/

#target illustrator

(function () {
  var VERSION = '1.0.0';
  var PT_TO_MM = 25.4 / 72;
  var RESULT_FILE_NAME = '_入稿チェック結果.json';
  // old / 旧 などのサブフォルダには降りない。同名ファイルが何世代も入っていて、
  // どれが現物か決められなくなるため（実データで4世代・12ファイルを確認済み）。
  var MONEY_RE = /(?:[¥￥\\]\s*[0-9０-９][0-9０-９,，]*)|(?:[0-9０-９][0-9０-９,，]*\s*円)/g;
  var TOMBO_HINTS = ['トンボ', 'とんぼ', 'ﾄﾝﾎﾞ', 'crop', 'trim', 'register', 'ﾄﾘﾑ'];
  // 旧版が入っているフォルダ。同名ファイルが何世代も入っていて現物を決められない。
  var SKIP_FOLDER_RE = /^(old|旧|bak|backup|archive|アーカイブ|過去|使わない)$/i;
  // 1つ2つ上のフォルダを選ばれたときの救済。深く掘るのは**やらない**:
  // Googleドライブはフォルダを開くたびに通信するので、実測で1フォルダ約0.5秒かかる。
  // 上の階層から全部舐めると240フォルダで2分たっても案件に届かなかった。
  // 深いところから探すのはブラウザ側（Drive APIの全文検索）の仕事にしてある。
  var SEARCH = { maxDepth: 2, maxFolders: 60, maxResults: 20, budgetMs: 20000 };

  function ptToMm(pt) { return pt * PT_TO_MM; }
  function round2(n) { return Math.round(n * 100) / 100; }

  // ExtendScript の File.name は URI エンコードされているので、日本語名は必ず decode する。
  function decodeName(f) {
    try { return decodeURI(f.name); } catch (e) { return f.name; }
  }

  function isoDate(d) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /* ---------- 最小限のJSON書き出し（ExtendScriptにJSONは無い） ---------- */

  function jsonString(s) {
    var out = '"';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i), code = s.charCodeAt(i);
      if (c === '"') out += '\\"';
      else if (c === '\\') out += '\\\\';
      else if (c === '\n') out += '\\n';
      else if (c === '\r') out += '\\r';
      else if (c === '\t') out += '\\t';
      else if (code < 0x20) out += '\\u' + ('000' + code.toString(16)).slice(-4);
      else out += c;
    }
    return out + '"';
  }

  function toJson(v, indent) {
    var pad = indent || '';
    var inner = pad + '  ';
    if (v === null || v === undefined) return 'null';
    var t = typeof v;
    if (t === 'string') return jsonString(v);
    if (t === 'number') return isFinite(v) ? String(v) : 'null';
    if (t === 'boolean') return v ? 'true' : 'false';
    if (v instanceof Array) {
      if (v.length === 0) return '[]';
      var parts = [];
      for (var i = 0; i < v.length; i++) parts.push(inner + toJson(v[i], inner));
      return '[\n' + parts.join(',\n') + '\n' + pad + ']';
    }
    var keys = [], k;
    for (k in v) if (v.hasOwnProperty(k)) keys.push(k);
    if (keys.length === 0) return '{}';
    var kv = [];
    for (var j = 0; j < keys.length; j++) {
      kv.push(inner + jsonString(keys[j]) + ': ' + toJson(v[keys[j]], inner));
    }
    return '{\n' + kv.join(',\n') + '\n' + pad + '}';
  }

  /* ---------- フォルダの中身を読む ---------- */

  // 直下の .ai だけを見る。getFiles はサブフォルダに降りないので、Folder を弾けばよい。
  function collectAiFiles(folder) {
    var entries = folder.getFiles();
    var pre = [], post = [], other = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!(e instanceof File)) continue;
      var name = decodeName(e);
      if (!/\.ai$/i.test(name)) continue;
      if (name.indexOf('[ol前]') !== -1) pre.push(e);
      else if (name.indexOf('[ol後]') !== -1) post.push(e);
      else other.push(e);
    }
    return { pre: pre, post: post, other: other };
  }

  // 同名・同種が複数あったら更新日時が最新のものを採る（採ったことは結果に残す）。
  function pickLatest(files) {
    if (files.length === 0) return null;
    var best = files[0];
    for (var i = 1; i < files.length; i++) {
      if (files[i].modified.getTime() > best.modified.getTime()) best = files[i];
    }
    return best;
  }

  /* ---------- 選ばれたフォルダの下から入稿データを探す ----------
   * 案件フォルダは深いところにあり、毎回6階層たどらせるのは運用に乗らない。
   * 直下に [ol前]/[ol後] が無ければ、下を掘って候補を出す。
   * 見つかったフォルダの中はそれ以上掘らない（old/ の旧版を拾わないため）。
   */
  function findCandidateFolders(root, onProgress) {
    var results = [];
    var visited = 0;
    var stopped = false;
    var deadline = (new Date()).getTime() + SEARCH.budgetMs;

    function walk(folder, depth) {
      if (stopped || depth > SEARCH.maxDepth) return;
      visited++;
      if (visited > SEARCH.maxFolders) { stopped = true; return; }
      if ((new Date()).getTime() > deadline) { stopped = true; return; }
      if (onProgress && visited % 5 === 0) onProgress(visited, results.length);

      var entries;
      try { entries = folder.getFiles(); } catch (e) { return; }

      var hasPre = false, hasPost = false, subs = [];
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (e instanceof Folder) {
          if (!SKIP_FOLDER_RE.test(decodeName(e))) subs.push(e);
          continue;
        }
        var name = decodeName(e);
        if (!/\.ai$/i.test(name)) continue;
        if (name.indexOf('[ol前]') !== -1) hasPre = true;
        else if (name.indexOf('[ol後]') !== -1) hasPost = true;
      }

      if (hasPre || hasPost) {
        results.push({ folder: folder, both: (hasPre && hasPost) });
        if (results.length >= SEARCH.maxResults) stopped = true;
        return; // ここが案件フォルダ。この下は掘らない
      }
      for (var j = 0; j < subs.length; j++) walk(subs[j], depth + 1);
    }

    walk(root, 0);
    return { results: results, visited: visited, stopped: stopped };
  }

  // 一覧に出すラベル。同名の案件フォルダ（最新制作物 など）が並ぶので、
  // 1つ上の階層まで見せないと区別がつかない。
  function candidateLabel(c) {
    var names = [];
    var f = c.folder;
    for (var i = 0; i < 3 && f; i++) {
      names.unshift(decodeName(f));
      f = f.parent;
    }
    var head = names.join(' / ');
    return c.both ? head : head + '　※[ol前]/[ol後] の片方しかありません';
  }

  function chooseCandidate(candidates, searchedRoot) {
    var w = new Window('dialog', '入稿フォルダを選んでください');
    w.orientation = 'column';
    w.alignChildren = 'fill';
    w.preferredSize.width = 620;

    var head = w.add('statictext', undefined,
      decodeName(searchedRoot) + ' の下に入稿データが ' + candidates.length + ' 件見つかりました。');
    head.characters = 70;

    var list = w.add('listbox', undefined, [], { multiselect: false });
    list.preferredSize.height = 280;
    for (var i = 0; i < candidates.length; i++) {
      var item = list.add('item', candidateLabel(candidates[i]));
      item.candidateIndex = i;
    }
    list.selection = 0;

    var note = w.add('statictext', undefined, 'old などのフォルダは探索から外しています。');
    note.characters = 70;

    var row = w.add('group');
    row.alignment = 'right';
    row.add('button', undefined, 'キャンセル', { name: 'cancel' });
    row.add('button', undefined, 'このフォルダをチェック', { name: 'ok' });

    if (w.show() !== 1 || !list.selection) return null;
    return candidates[list.selection.candidateIndex];
  }

  /* ---------- ドキュメントを調べる ---------- */

  function collectLayerNames(container, acc, depth) {
    // doc.layers はトップレベルしか返さないので、サブレイヤーまで再帰で降りる。
    // 旧版がここを見ていなかったせいで、トンボをサブレイヤーに入れている案件は
    // 毎回「要確認」になっていた。
    if (depth > 8) return;
    for (var i = 0; i < container.layers.length; i++) {
      var l = container.layers[i];
      acc.push(l.name);
      collectLayerNames(l, acc, depth + 1);
    }
  }

  function hasTomboHint(names) {
    for (var i = 0; i < names.length; i++) {
      var n = String(names[i]).toLowerCase();
      for (var j = 0; j < TOMBO_HINTS.length; j++) {
        if (n.indexOf(String(TOMBO_HINTS[j]).toLowerCase()) !== -1) return true;
      }
    }
    return false;
  }

  // 全ページアイテムの可視バウンズを1回だけ舐めて配列に持つ。
  // アートボードごとの塗り足し量は、このバウンズ群から後で計算する。
  function collectItemBounds(doc, onProgress) {
    var bounds = [];
    var n = doc.pageItems.length;
    for (var i = 0; i < n; i++) {
      if (onProgress && (i % 500) === 0) onProgress(i, n);
      try {
        var it = doc.pageItems[i];
        if (it.hidden) continue;
        // guides は PathItem にしか無い。他の型で参照すると環境によっては例外になり、
        // 外側の catch でそのアイテムごと落ちて塗り足しを取りこぼすので、単独で囲む。
        var isGuide = false;
        try { isGuide = (it.typename === 'PathItem' && it.guides === true); } catch (eg) {}
        if (isGuide) continue;
        var b = it.visibleBounds; // [left, top, right, bottom]
        if (!b) continue;
        bounds.push(b);
      } catch (e) { /* 壊れたアイテムは飛ばす */ }
    }
    return bounds;
  }

  function intersects(b, rect) {
    // b: [l,t,r,bo] / rect: [l,t,r,bo]  y は上が大きい
    return !(b[0] > rect[2] || b[2] < rect[0] || b[3] > rect[1] || b[1] < rect[3]);
  }

  function bleedForArtboard(rect, bounds) {
    var found = false;
    var l = rect[0], t = rect[1], r = rect[2], bo = rect[3];
    for (var i = 0; i < bounds.length; i++) {
      var b = bounds[i];
      if (!intersects(b, rect)) continue;
      found = true;
      if (b[0] < l) l = b[0];
      if (b[1] > t) t = b[1];
      if (b[2] > r) r = b[2];
      if (b[3] < bo) bo = b[3];
    }
    if (!found) return null;
    return {
      topMm: round2(ptToMm(t - rect[1])),
      rightMm: round2(ptToMm(r - rect[2])),
      bottomMm: round2(ptToMm(rect[3] - bo)),
      leftMm: round2(ptToMm(rect[0] - l))
    };
  }

  function inspectDocument(doc, wantText, onProgress) {
    var info = {};
    var notes = [];

    info.documentColorSpace = String(doc.documentColorSpace).indexOf('RGB') !== -1 ? 'RGB' : 'CMYK';

    /* アートボード：全部見る（旧版はアクティブな1枚だけだった） */
    var abs = [];
    var rects = [];
    for (var a = 0; a < doc.artboards.length; a++) {
      var ab = doc.artboards[a];
      var rect = ab.artboardRect;
      rects.push(rect);
      abs.push({
        index: a,
        name: ab.name,
        widthMm: round2(ptToMm(rect[2] - rect[0])),
        heightMm: round2(ptToMm(Math.abs(rect[1] - rect[3])))
      });
    }
    info.artboards = abs;

    /* リンク画像：placedItems に加えて、埋め込みでない rasterItems も見る */
    var linked = [];
    for (var p = 0; p < doc.placedItems.length; p++) {
      try { linked.push(decodeURI(doc.placedItems[p].file.name)); }
      catch (e) { linked.push('(ファイル名取得不可・リンク切れの可能性)'); }
    }
    var rasterTotal = doc.rasterItems.length;
    var rasterLinked = 0;
    for (var r = 0; r < rasterTotal; r++) {
      try {
        if (doc.rasterItems[r].embedded === false) {
          rasterLinked++;
          try { linked.push(decodeURI(doc.rasterItems[r].file.name)); }
          catch (e2) { linked.push('(ファイル名取得不可・リンク切れの可能性)'); }
        }
      } catch (e3) { /* embedded を持たない場合がある */ }
    }
    info.linkedImages = { count: linked.length, names: linked };
    info.rasterItemCount = rasterTotal;
    info.rasterLinkedCount = rasterLinked;

    /* 生きたテキスト */
    info.liveTextCount = doc.textFrames.length;
    notes.push('生きたテキストの件数はシンボル定義内・配置EPS内のテキストを含まない。0件でも「絶対に無い」とは言い切れない。');

    if (wantText) {
      var texts = [];
      var money = [];
      for (var i = 0; i < doc.textFrames.length; i++) {
        var c = '';
        try { c = String(doc.textFrames[i].contents); } catch (e4) { continue; }
        c = c.replace(/[\r\n]+/g, ' / ');
        texts.push(c);
        var m = c.match(MONEY_RE);
        if (m) for (var k = 0; k < m.length; k++) money.push(m[k]);
      }
      info.texts = texts;
      info.moneyStrings = money;
    }

    /* レイヤー名（再帰）＋ 塗り足しの実測 */
    var names = [];
    collectLayerNames(doc, names, 0);
    info.layerNames = names;
    info.tomboLayerNameHit = hasTomboHint(names);

    var bounds = collectItemBounds(doc, onProgress);
    info.pageItemCount = bounds.length;
    var bleeds = [];
    for (var q = 0; q < rects.length; q++) bleeds.push(bleedForArtboard(rects[q], bounds));
    info.bleedByArtboard = bleeds;
    notes.push('bleedByArtboard はアートボードの外にオブジェクトがどれだけはみ出しているかの実測値(mm)。トンボ本体もここに含まれるため、値が大きい場合はトンボ込みの可能性がある。');

    info.notes = notes;
    return info;
  }

  /* ---------- 進捗ウィンドウ ---------- */

  function makeProgress() {
    var w = new Window('palette', 'GAAAT 入稿チェック', undefined);
    w.orientation = 'column';
    w.alignChildren = 'fill';
    w.preferredSize.width = 460;
    var label = w.add('statictext', undefined, '準備中…');
    label.characters = 60;
    var sub = w.add('statictext', undefined, '');
    sub.characters = 60;
    var bar = w.add('progressbar', undefined, 0, 100);
    bar.preferredSize.height = 12;
    w.show();
    return {
      set: function (msg, subMsg, pct) {
        label.text = msg;
        sub.text = subMsg || '';
        if (pct !== undefined) bar.value = pct;
        w.update();
      },
      close: function () { w.close(); }
    };
  }

  /* ---------- 本体 ---------- */

  function run() {
    var folder = Folder.selectDialog('入稿フォルダを選んでください（[ol前]/[ol後] の .ai が入っているフォルダ）');
    if (!folder) return;

    var found = collectAiFiles(folder);
    var searchNote = null;

    // 直下に無ければ下を探す。上の階層を選ばれるのが普通なので、これが既定の流れ。
    if (found.pre.length === 0 && found.post.length === 0) {
      var seek = makeProgress();
      seek.set('入稿データを探しています…', decodeName(folder) + ' の下を確認しています', 0);
      var search = findCandidateFolders(folder, function (v, r) {
        seek.set('入稿データを探しています…',
          'フォルダ ' + v + ' 件を確認 / 見つかった案件 ' + r + ' 件');
      });
      seek.close();

      if (search.results.length === 0) {
        alert('[ol前] / [ol後] の .ai が見つかりませんでした。\n\n' +
          '探した場所: ' + decodeURI(folder.fsName) + '\n' +
          '確認したフォルダ: ' + search.visited + ' 件\n\n' +
          (search.stopped
            ? '近くのフォルダしか探していません（ドライブは1フォルダ開くのに\n' +
              '約0.5秒かかるため、深く掘ると終わらない）。\n' +
              'チェック用ページの「案件を一覧から選ぶ」で場所を調べてから、\n' +
              'そのフォルダを直接指定してください。\n\n'
            : '') +
          'old などのフォルダの中は、同名ファイルが何世代も入っていて\n' +
          'どれが現物か決められないため、あえて見ていません。');
        return;
      }

      var picked;
      if (search.results.length === 1) {
        picked = search.results[0];
      } else {
        picked = chooseCandidate(search.results, folder);
        if (!picked) return;
      }
      folder = picked.folder;
      found = collectAiFiles(folder);
      searchNote = '選んだフォルダの下から「' + decodeName(folder) + '」を見つけてチェックしました。';
      if (search.stopped) {
        searchNote += '（フォルダが多かったため探索を途中で打ち切っています。目的の案件が出てこない場合は、もう少し下の階層を選んでください）';
      }
    }

    var result = {
      tool: 'gaaat-preflight',
      version: VERSION,
      checkedAt: isoDate(new Date()),
      folderPath: decodeURI(folder.fsName),
      folderName: decodeName(folder),
      warnings: [],
      files: {}
    };

    if (searchNote) result.warnings.push(searchNote);

    var pre = pickLatest(found.pre);
    var post = pickLatest(found.post);

    if (found.pre.length > 1) result.warnings.push('[ol前] の .ai が ' + found.pre.length + ' 件あります。更新日時が最新のものを使いました: ' + decodeName(pre));
    if (found.post.length > 1) result.warnings.push('[ol後] の .ai が ' + found.post.length + ' 件あります。更新日時が最新のものを使いました: ' + decodeName(post));
    if (!pre) result.warnings.push('[ol前] の .ai が見つかりません。');
    if (!post) result.warnings.push('[ol後] の .ai が見つかりません。');

    // ファイルを開く前に判定できるので最初にやる。
    // 実データで「アウトライン後に [ol前] を直して [ol後] を作り直していない」世代を確認済み。
    if (pre && post) {
      result.preModified = isoDate(pre.modified);
      result.postModified = isoDate(post.modified);
      result.preIsNewerThanPost = pre.modified.getTime() > post.modified.getTime();
    }

    var targets = [];
    if (pre) targets.push({ role: 'pre', file: pre });
    if (post) targets.push({ role: 'post', file: post });

    var ui = makeProgress();
    var prevInteraction = app.userInteractionLevel;
    // リンク切れやフォント未所持のダイアログでバッチが止まるのを防ぐ。
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    try {
      for (var t = 0; t < targets.length; t++) {
        var target = targets[t];
        var name = decodeName(target.file);
        var base = Math.round((t / targets.length) * 100);
        var span = Math.round(100 / targets.length);

        ui.set(name + ' を開いています…',
          Math.round(target.file.length / 1048576) + ' MB。クラウドから降りてくる場合は数分かかります。', base);

        var doc = null;
        var entry = {
          role: target.role,
          fileName: name,
          fileSizeBytes: target.file.length,
          modified: isoDate(target.file.modified)
        };

        try {
          doc = app.open(target.file);
          ui.set(name + ' を調べています…', '', base + Math.round(span * 0.3));
          var info = inspectDocument(doc, target.role === 'pre', function (i, n) {
            ui.set(name + ' を調べています…', 'オブジェクト ' + i + ' / ' + n,
              base + Math.round(span * (0.3 + 0.6 * (i / Math.max(n, 1)))));
          });
          for (var key in info) if (info.hasOwnProperty(key)) entry[key] = info[key];
          entry.opened = true;
        } catch (e) {
          entry.opened = false;
          entry.error = String(e);
          result.warnings.push(name + ' を開けませんでした: ' + String(e));
        } finally {
          if (doc) {
            try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e5) {}
          }
        }
        result.files[target.role] = entry;
      }
    } finally {
      app.userInteractionLevel = prevInteraction;
    }

    ui.set('結果を書き出しています…', '', 98);
    var out = new File(folder.fsName + '/' + RESULT_FILE_NAME);
    out.encoding = 'UTF-8';
    out.lineFeed = 'Unix';
    var wrote = false;
    try {
      if (out.open('w')) { out.write(toJson(result, '')); out.close(); wrote = true; }
    } catch (e6) { wrote = false; }
    ui.close();

    if (!wrote) {
      alert('結果ファイルを書き出せませんでした。\n\n' +
        'フォルダに書き込み権限があるか確認してください:\n' + decodeURI(folder.fsName));
      return;
    }

    var summary = [];
    summary.push('チェックが終わりました。');
    summary.push('');
    summary.push('書き出し先:');
    summary.push(decodeURI(out.fsName));
    summary.push('');
    summary.push('このJSONを check/ のページにドラッグ&ドロップすると、');
    summary.push('サイズと金額をシートと突き合わせた合否が出ます。');
    if (result.warnings.length) {
      summary.push('');
      summary.push('■ 注意');
      for (var wI = 0; wI < result.warnings.length; wI++) summary.push('・' + result.warnings[wI]);
    }
    if (result.preIsNewerThanPost) {
      summary.push('');
      summary.push('■ [ol前] のほうが [ol後] より新しいです。');
      summary.push('  アウトライン化のあとに [ol前] を直して、[ol後] を作り直していない可能性があります。');
    }
    alert(summary.join('\n'));
  }

  run();
})();
