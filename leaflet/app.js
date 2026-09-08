// GAAAT リーフレット自動生成ツール（A4三つ折り）
//
// バナーツール（../app.js）と同じ考え方で、案件シートの情報を差し替えるだけで
// A4横・三つ折りのリーフレット（内面＝作品LIST／外面＝表紙・裏表紙・折り込み）を
// 組版する。言語切り替えと会期ごとの一括生成は要件から外してあるので、
// ここでは「作品をきちんと並べる」「順番を自分で変えられる」「掲載する作品を選べる」
// の3点に絞っている。
//
// 折りの構造（巻き三つ折り）と面の対応:
//   用紙を開いた面（内面）を左から C1 / C2 / C3 とすると、
//   C3 → C2 の上に、さらに C1 → その上に、と巻き込んで畳まれる。
//   したがって外面を印刷する向き（左右反転）では 左から C3 / C2 / C1 になり、
//   C1 の外面＝表紙、C2 の外面＝裏表紙、C3 の外面＝開いて最初に見える折り込み面。
//   C3 は内側に巻き込まれるぶん、他より少し細くする必要がある（既定 98mm）。

// ---------- 定数 ----------

const SHEET_W_MM = 297;   // A4横
const SHEET_H_MM = 210;
const PREVIEW_DPI = 110;  // 画面プレビューは軽さ優先。書き出し時だけ選択dpiで描き直す

// 「GAAAT / Metal Canvas Art とは」と「作品購入の仕方」は、案件が変わっても
// 毎回まったく同じ文言で刷る面なので、入力欄ではなくここに固定で持つ。
// 文面は既存リーフレット（R222_syoyo_リーフレット_表（外））に合わせてある。
// 変更が必要になったらこの定数だけを直せば、全案件に一度に反映される。
const BOILERPLATE = {
  about: {
    heading: 'GAAAT',
    lead: 'Crafting Art Experience Beyond Dimension.',
    ja: 'GAAATは、2次元と3次元を横断して、アートの新たな鑑賞体験を創造するブランドです。国内外の様々なクリエイターや企業とパートナーシップを結び、独自のデータ設計技術／製造技術を駆使して、アートの魅力と可能性を拡張します。',
    en: 'GAAAT is a brand that creates new art viewing experiences by crossing the boundaries between 2D and 3D. Partnering with various creators and companies both domestically and internationally, we expand the charm and possibilities of art by utilizing our unique data design and manufacturing technologies.'
  },
  mca: {
    heading: 'Metal Canvas Art とは',
    ja: '「Metal Canvas Art（MCA）」は、独自の技術を使用してデジタルアートから製造した最高品質の2.5Dアートです。繊細な描画のためのデータ設計技術と、特殊な塗装技術で製造される金属製の作品は、重厚感だけでなく耐久性に優れていることが特長です。2.5次元での立体表現により、唯一無二の価値を実現します。',
    en: 'Metal Canvas Art (MCA) is a premium-quality 2.5D artwork created from digital art using unique technology. Designed with precision data techniques for intricate detail and manufactured with specialized coating methods, these metal pieces are characterized by both substantial weight and exceptional durability. The 2.5D dimensional effect brings a unique value that is unmatched.'
  },
  buy: {
    heading: '作品購入の仕方',
    headingEn: 'How to buy',
    steps: [
      { ja: 'まずは実際に作品をお楽しみください。', en: 'Please enjoy the artworks first.' },
      { ja: '各作品の近くに設置されたQRコードをスマートフォンで読み取ってください。', en: 'Scan the QR code near each artwork with your smartphone.' },
      { ja: '購入ページにアクセスし、ご希望の商品をカートに追加して決済。', en: 'Access the online store, add the artwork to the cart and complete the payment.' }
    ]
  }
};

// 購入手順の挿絵。既存リーフレット（R222_syoyo_リーフレット_表（外））から
// 等倍で切り出した線画で、案件が変わっても共通で使う。
const HOWTO_ILLUSTRATIONS = ['assets/howto-1.png', 'assets/howto-2.png', 'assets/howto-3.png'];

// GAAAT面の下端に並ぶ4つのQR。案件によらず毎回同じものを刷るので、既存
// リーフレットから切り出した画像を同梱して既定にしてある。アップロードすれば
// その案件だけ差し替わる（state[key] が既定より優先される）。
const BRAND_QR_SLOTS = [
  { key: 'qrWeb', label: 'web', src: 'assets/qr-web.png' },
  { key: 'qrEc', label: 'EC', src: 'assets/qr-ec.png' },
  { key: 'qrX', label: 'X', src: 'assets/qr-x.png' },
  { key: 'qrIg', label: 'Instagram', src: 'assets/qr-ig.png' }
];

const FONT_JP = '"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif';
const FONT_SERIF = '"Noto Serif JP","Hiragino Mincho ProN","Yu Mincho",serif';
const FONT_EN = '"Oswald","Inter","Helvetica Neue",sans-serif';

// バナーツールと同じOAuthクライアントID。ドライブ（作品画像）とスプレッドシート
// （案件シート）の両方を1回のログインで読む。承認済みJavaScript生成元は
// オリジン単位なので、バナーツールと同じホストに置く限り追加設定は不要。
const GOOGLE_CLIENT_ID = '595263181261-86c5uct9ojm2tteir113gb2qlg9rvrod.apps.googleusercontent.com';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly';

// ---------- 状態 ----------

const state = {
  artworks: [],        // { code,name,artist,desc,priceIn,priceEx,size,edition,material,imageRef,include,img,imgStatus }
  sourceOrder: [],     // シート読み込み直後の並び（「並び順を戻す」用）
  googleAccessToken: null,
  driveFiles: [],      // 画像フォルダのファイル一覧（ファイル名マッチ用）
  qrList: null,
  qrDefaults: {},   // 同梱のブランドQR（アップロードが無いときに使う）
  howto: [],   // 購入手順の挿絵（HOWTO_ILLUSTRATIONS を読み込んだもの）
  coverImage: null,
  ipLogo: null,   // 版元支給のIPロゴ（Fロゴロックアップ型で使う）
  logo: null
};

// ---------- DOM ----------

const $ = id => document.getElementById(id);
const els = {
  sheetsSetupNote: $('sheetsSetupNote'), signInBtn: $('signInBtn'), authStatus: $('authStatus'),
  sheetsUrlInput: $('sheetsUrlInput'), loadSheetsBtn: $('loadSheetsBtn'), sheetsStatus: $('sheetsStatus'),
  pasteArea: $('pasteArea'), applyPasteBtn: $('applyPasteBtn'),

  driveFolderInput: $('driveFolderInput'), loadDriveFolderBtn: $('loadDriveFolderBtn'),
  driveStatus: $('driveStatus'),

  selectAllBtn: $('selectAllBtn'), deselectAllBtn: $('deselectAllBtn'), resetOrderBtn: $('resetOrderBtn'),
  artList: $('artList'), artListHint: $('artListHint'),

  qrListInput: $('qrListInput'), qrListCaption: $('qrListCaption'), qrListNote: $('qrListNote'),

  coverTitle: $('coverTitle'), coverSubtitle: $('coverSubtitle'),
  copyright: $('copyright'),
  coverImageInput: $('coverImageInput'), coverDark: $('coverDark'),
  coverTemplate: $('coverTemplate'), coverAuto: $('coverAuto'), ipLogoInput: $('ipLogoInput'),

  boilerplatePreview: $('boilerplatePreview'), footNote: $('footNote'),

  listHeading: $('listHeading'), colsPerPanel: $('colsPerPanel'), imageRatio: $('imageRatio'),
  fldArtist: $('fldArtist'), fldSize: $('fldSize'), fldPriceIn: $('fldPriceIn'), fldPriceEx: $('fldPriceEx'),
  fldEdition: $('fldEdition'), fldMaterial: $('fldMaterial'), fldCode: $('fldCode'), fldDesc: $('fldDesc'),
  showArtistBio: $('showArtistBio'), artistBioName: $('artistBioName'), artistBioText: $('artistBioText'),
  layoutWarning: $('layoutWarning'),

  foldType: $('foldType'), dpi: $('dpi'), bleed: $('bleed'), showTrim: $('showTrim'), showFold: $('showFold'),
  colBg: $('colBg'), colText: $('colText'), colAccent: $('colAccent'),

  downloadPdfBtn: $('downloadPdfBtn'), downloadInnerBtn: $('downloadInnerBtn'),
  downloadOuterBtn: $('downloadOuterBtn'), exportStatus: $('exportStatus'),

  canvasInner: $('canvasInner'), canvasOuter: $('canvasOuter')
};

function setStatus(el, message, isError) {
  el.style.display = message ? '' : 'none';
  el.textContent = message || '';
  el.classList.toggle('error', !!isError);
}

// ---------- 案件シートのパース ----------
// 案件シートは案件ごとに列の数も並びも違うので、列位置ではなく見出しの文字で
// 列を特定する。「作品名」を含む行を見出し行とみなし、その下に続く行を作品として
// 読む。1つのタブに表が複数あっても、見出し行を見つけるたびに対応表を差し替える
// ので、そのまま読み込める。

// 上から順に照合するので、より限定的な見出し（作品名（EN）／額装サイズ 等）を
// 一般的な見出し（作品名／サイズ）より前に置いてある。
const HEADER_ALIASES = [
  ['nameEn',      ['作品名(en)']],
  ['name',        ['作品名', '商品名', '作品タイトル']],
  ['artistEn',    ['アーティスト名(en)', '作家名(en)']],
  ['artist',      ['アーティスト名', '作家名', 'アーティスト']],
  ['descEn',      ['説明(en)', '作品説明(en)']],
  ['desc',        ['説明', '作品説明']],
  ['priceIn',     ['価格(税込)', '販売価格(税込)']],
  ['priceEx',     ['価格(税抜)', '販売価格(税抜)']],
  ['priceUsd',    ['価格(ドル)']],
  ['sizeFramed',  ['額装サイズ']],
  ['sizeEn',      ['size']],
  ['size',        ['サイズ', 'アートサイズ']],
  ['image',       ['画像リンク', '画像']],
  ['copyright',   ['コピーライト']],
  ['edition',     ['エディション']],
  ['material',    ['画材/技法', '画材', '技法']],
  ['code',        ['ハンドル名', '作品ナンバー', '作品番号']],
  ['pjCode',      ['pjコード']]
];

function normalizeHeader(raw) {
  return String(raw || '')
    .replace(/[\s　]/g, '')
    .replace(/[（］【]/g, '(')
    .replace(/[）］】]/g, ')')
    .replace(/[［]/g, '(')
    .replace(/／/g, '/')
    .toLowerCase();
}

function isHeaderRow(cells) {
  return cells.some(c => normalizeHeader(c).startsWith('作品名'));
}

// 見出し行 → { キー: 列番号 }。同じキーに複数列が当たった場合は左の列を採用する。
function buildColumnMap(cells) {
  const map = {};
  cells.forEach((cell, idx) => {
    const h = normalizeHeader(cell);
    if (!h) return;
    for (const [key, aliases] of HEADER_ALIASES) {
      if (aliases.some(a => h.startsWith(a))) {
        if (!(key in map)) map[key] = idx;
        return;
      }
    }
  });
  return map;
}

function cleanCell(v) {
  return String(v == null ? '' : v).replace(/[\s　]+/g, ' ').trim();
}

// 1セルに作品サイズと額装サイズが同居している案件があるので、作品サイズ側だけを取る。
// 書き方は案件ごとにバラバラで、少なくとも次の2通りが実在する:
//   「420（H）×297（W）mm [額装サイズ]533（H）×382（W）mm」
//   「作品サイズ：(H)841ｘ(W)547 額装外寸：(H)1147 x (W)846」
function splitArtSize(raw) {
  const s = cleanCell(raw);
  if (!s) return '';
  return s
    .split(/\[?\s*額装(?:サイズ|外寸|寸法)\s*\]?|\[framed\s*size\]/i)[0]
    .replace(/^(?:作品サイズ|アート寸法|サイズ)\s*[：:]\s*/, '')   // 「作品サイズ：」「アート寸法：」の見出しは落とす
    .replace(/[\s\[［]+$/, '')                    // 分割で残る「 [」を掃除
    .trim();
}

// ドライブのファイルURL。フォルダURL（/drive/folders/…）は拾わない。
const DRIVE_FILE_URL_RE = /https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^\s]*id=)[\w-]+/;

// 「画像リンク（ドライブ）」列が空でも、行のどこかにドライブのファイルURLが
// 入っていればそれを使う。見出しが空欄の列（1行上に「URL」とだけ書かれた
// グループ見出しの下）にURLを置いている案件があり、見出し文字では引けないため。
function findDriveUrlInRow(cells) {
  for (const cell of cells) {
    const m = String(cell || '').match(DRIVE_FILE_URL_RE);
    if (m) return m[0];
  }
  return '';
}

function parseRows(rows) {
  const items = [];
  let map = null;
  for (const cells of rows) {
    if (isHeaderRow(cells)) {
      map = buildColumnMap(cells);
      continue;
    }
    if (!map || map.name === undefined) continue;

    const name = cleanCell(cells[map.name]);
    if (!name) continue;
    // 「記入例→」の行と、罫線・結合セルの残骸は作品として扱わない。
    const first = cleanCell(cells[0]);
    if (first.includes('記入例') || name.includes('記入例')) continue;
    if (/^\[merged\]/.test(name) || name === '作品名') continue;

    const get = key => (map[key] === undefined ? '' : cleanCell(cells[map[key]]));
    items.push({
      code: get('code'),
      name,
      nameEn: get('nameEn'),
      artist: get('artist'),
      artistEn: get('artistEn'),
      desc: get('desc'),
      priceIn: get('priceIn'),
      priceEx: get('priceEx'),
      size: splitArtSize(map.size !== undefined ? cells[map.size] : '') || splitArtSize(map.sizeEn !== undefined ? cells[map.sizeEn] : ''),
      sizeFramed: get('sizeFramed'),
      edition: get('edition'),
      material: get('material'),
      copyright: get('copyright'),
      imageRef: get('image') || findDriveUrlInRow(cells),
      include: true,
      img: null,
      imgStatus: ''
    });
  }
  return items;
}

// パース結果をリストに反映する。作品名が同じ既存アイテムがあれば、掲載チェック・
// 並び順・読み込み済み画像を引き継ぐ（シートを直して読み直しても作業が消えない）。
function applyArtworks(items) {
  const prev = new Map(state.artworks.map(a => [a.code + '\u0000' + a.name, a]));
  items.forEach(item => {
    const old = prev.get(item.code + '\u0000' + item.name);
    if (old) {
      item.include = old.include;
      item.img = old.img;
      item.imgStatus = old.imgStatus;
    }
  });
  state.artworks = items;
  state.sourceOrder = items.slice();

  // アーティスト紹介の名前が空なら、シートの1作品目のアーティスト名を入れておく。
  if (!els.artistBioName.value.trim()) {
    const withArtist = items.find(a => a.artist);
    if (withArtist) els.artistBioName.value = withArtist.artist;
  }
  // コピーライトも同様に、未入力なら1件目から引く。
  const withCopyright = items.find(a => a.copyright);
  if (withCopyright && !els.copyright.value.trim()) els.copyright.value = withCopyright.copyright;

  renderArtList();
  render();
  return `${items.length}件の作品を読み込みました。`;
}

// ---------- 作品リストUI ----------

let dragIndex = null;

function artDetailLine(a) {
  return [a.code, a.artist, a.size, a.priceIn || a.priceEx].filter(Boolean).join(' / ');
}

function renderArtList() {
  els.artList.innerHTML = '';
  if (!state.artworks.length) {
    els.artListHint.textContent = 'まだ作品が読み込まれていません。';
    return;
  }
  state.artworks.forEach((a, i) => {
    const item = document.createElement('div');
    item.className = 'art-item' + (a.include ? '' : ' off');
    item.draggable = true;
    item.dataset.index = String(i);

    const handle = document.createElement('span');
    handle.className = 'handle';
    handle.textContent = '⠿';
    handle.title = 'ドラッグで並び替え';
    item.appendChild(handle);

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = a.include;
    cb.title = 'リーフレットに掲載する';
    cb.addEventListener('change', () => {
      a.include = cb.checked;
      item.classList.toggle('off', !a.include);
      render();
    });
    item.appendChild(cb);

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.title = 'クリックして画像を差し替え';
    if (a.img) thumb.style.backgroundImage = `url(${a.img.src})`;
    else thumb.textContent = a.imgStatus === 'error' ? '×' : '画像';
    thumb.addEventListener('click', () => pickImageFor(a));
    item.appendChild(thumb);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = `${i + 1}. ${a.name}`;
    const detail = document.createElement('div');
    detail.className = 'detail';
    detail.textContent = artDetailLine(a);
    meta.appendChild(name);
    meta.appendChild(detail);
    item.appendChild(meta);

    item.addEventListener('dragstart', evt => {
      dragIndex = i;
      item.classList.add('dragging');
      evt.dataTransfer.effectAllowed = 'move';
      // Firefox はデータをセットしないとドラッグが始まらない。
      evt.dataTransfer.setData('text/plain', String(i));
    });
    item.addEventListener('dragend', () => {
      dragIndex = null;
      item.classList.remove('dragging');
      clearDropMarks();
    });
    item.addEventListener('dragover', evt => {
      if (dragIndex === null) return;
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'move';
      const rect = item.getBoundingClientRect();
      const after = evt.clientY > rect.top + rect.height / 2;
      clearDropMarks();
      item.classList.add(after ? 'drop-after' : 'drop-before');
    });
    item.addEventListener('drop', evt => {
      if (dragIndex === null) return;
      evt.preventDefault();
      const rect = item.getBoundingClientRect();
      const after = evt.clientY > rect.top + rect.height / 2;
      let target = i + (after ? 1 : 0);
      const moved = state.artworks.splice(dragIndex, 1)[0];
      if (dragIndex < target) target -= 1;
      state.artworks.splice(target, 0, moved);
      dragIndex = null;
      clearDropMarks();
      renderArtList();
      render();
    });

    els.artList.appendChild(item);
  });

  const on = state.artworks.filter(a => a.include).length;
  const withImg = state.artworks.filter(a => a.include && a.img).length;
  els.artListHint.textContent =
    `全${state.artworks.length}件中 ${on}件を掲載（うち画像あり ${withImg}件）。行をドラッグすると並び順を入れ替えられます。`;
}

function clearDropMarks() {
  els.artList.querySelectorAll('.art-item').forEach(el => {
    el.classList.remove('drop-before', 'drop-after');
  });
}

// サムネイルをクリックしたときの個別差し替え。ドライブに画像が無い・名前が
// 合わない作品を手作業で埋められるようにするための逃げ道。
function pickImageFor(artwork) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    loadImageFromBlob(file).then(img => {
      artwork.img = img;
      artwork.imgStatus = 'ok';
      renderArtList();
      render();
    }).catch(() => {
      artwork.imgStatus = 'error';
      renderArtList();
    });
  });
  input.click();
}

// 版元支給のマスターがTIFのことがあるが、ブラウザはTIFFを表示できない
// （<img src="*.tif"> は必ず onerror になる）。UTIFでデコードしてCanvasに載せる。
// 印刷マスターは1200dpiで数千万画素あり、そのままRGBA8に展開すると数百MBに
// なるので、A4三つ折りの版面に必要な解像度まで落としてから返す。
const TIFF_MAX_EDGE = 4200;   // A4長辺297mmを約360dpiで刷れる程度

function isTiffBlob(blob) {
  return /tif/i.test(blob.type || '') || /\.tiff?$/i.test(blob.name || '');
}

async function decodeTiff(blob) {
  if (typeof UTIF === 'undefined') {
    throw new Error('TIFFデコーダ(UTIF)が読み込めていません。ネットワークを確認してください。');
  }
  const buf = await blob.arrayBuffer();
  const ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error('TIFFを解釈できませんでした。');
  const page = ifds[0];
  UTIF.decodeImage(buf, page, ifds);
  const rgba = UTIF.toRGBA8(page);
  const src = document.createElement('canvas');
  src.width = page.width; src.height = page.height;
  src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer), page.width, page.height), 0, 0);

  const scale = Math.min(1, TIFF_MAX_EDGE / Math.max(page.width, page.height));
  if (scale === 1) return src;
  const out = document.createElement('canvas');
  out.width = Math.round(page.width * scale);
  out.height = Math.round(page.height * scale);
  const cx = out.getContext('2d');
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

function loadImageFromBlob(blob) {
  if (isTiffBlob(blob)) return decodeTiff(blob);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------- Google 認証 ----------

function isGoogleConfigured() {
  return !!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_OAUTH_CLIENT_ID');
}

let googleTokenClient = null;
let authRequestTimer = null;

function initGoogleAuthUI(attempt) {
  attempt = attempt || 0;
  if (!isGoogleConfigured()) {
    els.sheetsSetupNote.textContent = 'Google連携は未設定です。app.js の GOOGLE_CLIENT_ID にOAuthクライアントIDを設定すると使えます。';
    els.signInBtn.disabled = true;
    return;
  }
  if (typeof google === 'undefined' || !google.accounts) {
    // GISのスクリプトは async なので少し待つ。ただし広告ブロッカー等で完全に
    // 遮断されている場合は永遠に来ないので、約15秒であきらめて理由を出す。
    if (attempt >= 50) {
      els.sheetsSetupNote.textContent = 'Google連携の読み込みに失敗しました。拡張機能（広告ブロッカー等）やネットワークが accounts.google.com への通信を遮断していないか確認して、ページを再読み込みしてください。';
      els.signInBtn.disabled = true;
      return;
    }
    els.sheetsSetupNote.textContent = 'Google連携を読み込み中…';
    els.signInBtn.disabled = true;
    setTimeout(() => initGoogleAuthUI(attempt + 1), 300);
    return;
  }
  els.sheetsSetupNote.textContent = '';
  els.signInBtn.disabled = false;
  googleTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: resp => {
      clearTimeout(authRequestTimer);
      if (resp.error) {
        setStatus(els.authStatus, `ログインに失敗しました: ${resp.error}`, true);
        return;
      }
      state.googleAccessToken = resp.access_token;
      setStatus(els.authStatus, '');
      setSignedInUI(true);
    }
  });
}

// ログイン状態に合わせてボタンの見た目を切り替える。トークン失効時に
// 押せる状態へ戻す必要があるので、ログイン成功時と共用にしてある。
function setSignedInUI(signedIn) {
  els.signInBtn.textContent = signedIn
    ? 'Googleにログイン済み（ドライブ・スプレッドシート）'
    : 'Googleでログイン';
  els.signInBtn.disabled = !!signedIn;
}

function requestGoogleSignIn() {
  if (!googleTokenClient) return;
  setStatus(els.authStatus, 'Googleのログイン画面を開いています…');
  // ポップアップがブロックされると何のコールバックも来ないため、
  // 一定時間で「たぶんブロックされています」と案内する。
  clearTimeout(authRequestTimer);
  authRequestTimer = setTimeout(() => {
    setStatus(els.authStatus, 'ログイン画面が開けませんでした。ブラウザのポップアップブロックを解除して、もう一度お試しください。', true);
  }, 4000);
  googleTokenClient.requestAccessToken();
}

async function googleApiFetch(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${state.googleAccessToken}` } });
  // アクセストークンは1時間ほどで失効する。以前はここで止まってもボタンが
  // 「ログイン済み」のまま無効だったので、ページをリロード（＝入力内容を
  // 捨てる）しないと復帰できなかった。押せる状態に戻して案内する。
  if (res.status === 401) {
    state.googleAccessToken = null;
    setSignedInUI(false);
    setStatus(els.authStatus, 'Googleログインの有効期限が切れました。もう一度「Googleでログイン」を押してください（入力内容や読み込み済みの作品はそのまま残ります）。', true);
    throw new Error('ログインの有効期限が切れました。再ログインしてから、もう一度実行してください。');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

// ---------- スプレッドシート読み込み ----------

function extractSheetsInfo(input) {
  const s = String(input || '').trim();
  const idMatch = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) return null;
  const gidMatch = s.match(/[#&]gid=(\d+)/);
  return { spreadsheetId: idMatch[1], gid: gidMatch ? gidMatch[1] : null };
}

async function loadFromSheetsUrl(url) {
  const info = extractSheetsInfo(url);
  if (!info) {
    setStatus(els.sheetsStatus, 'スプレッドシートのURLを正しく入力してください。', true);
    return;
  }
  try {
    setStatus(els.sheetsStatus, 'シート情報を確認中…');
    const metaRes = await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}?fields=sheets.properties`
    );
    const meta = await metaRes.json();
    const sheetsList = meta.sheets || [];
    if (!sheetsList.length) throw new Error('シートが見つかりませんでした。');

    let props = sheetsList[0].properties;
    if (info.gid !== null) {
      const match = sheetsList.find(s => String(s.properties.sheetId) === info.gid);
      if (match) props = match.properties;
    }

    setStatus(els.sheetsStatus, `「${props.title}」タブを読み込み中…`);
    const range = encodeURIComponent(`'${props.title}'!A1:BZ2000`);
    const valuesRes = await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${range}`
    );
    const rows = (await valuesRes.json()).values || [];
    const items = parseRows(rows);
    if (!items.length) {
      setStatus(els.sheetsStatus, `「${props.title}」タブに作品の行が見つかりませんでした。「作品名」の見出しがあるタブを開いた状態のURLを貼ってください。`, true);
      return;
    }
    setStatus(els.sheetsStatus, `「${props.title}」タブから${applyArtworks(items)}`);
  } catch (err) {
    console.error(err);
    setStatus(els.sheetsStatus, `読み込みに失敗しました: ${err.message}`, true);
  }
}

// ---------- ドライブから作品画像 ----------

function extractDriveFolderId(input) {
  const s = String(input || '').trim();
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
  return null;
}

function extractDriveFileId(input) {
  const s = String(input || '').trim();
  const m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
            s.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
            s.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : null;
}

// フォルダ直下だけでなく、作品名ごとのサブフォルダに分かれているパターンにも
// 対応する（例: シグルイ/デザインデータ/流れ星/*.tif）。幅優先でたどり、各画像に
// 「どのフォルダに入っていたか」を持たせて、あとでフォルダ名でも突き合わせられる
// ようにしている。フォルダ数が多い案件でも止まらないよう、探索の上限を設けている。
const DRIVE_MAX_FOLDERS = 60;

async function listDriveChildren(folderId, mimeClause) {
  const q = encodeURIComponent(`'${folderId}' in parents and ${mimeClause} and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType),nextPageToken');
  let out = [];
  let pageToken = '';
  do {
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200` +
      (pageToken ? `&pageToken=${pageToken}` : '');
    const data = await (await googleApiFetch(url)).json();
    out = out.concat(data.files || []);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return out;
}

async function loadDriveFolder(folderId) {
  setStatus(els.driveStatus, 'フォルダを読み込み中…');
  try {
    const files = [];
    const queue = [{ id: folderId, name: '' }];
    let scanned = 0;

    while (queue.length && scanned < DRIVE_MAX_FOLDERS) {
      const cur = queue.shift();
      scanned++;
      setStatus(els.driveStatus, `フォルダを読み込み中… (${scanned}件目${cur.name ? ' / ' + cur.name : ''})`);

      const imgs = await listDriveChildren(cur.id, `mimeType contains 'image/'`);
      imgs.forEach(f => files.push({ ...f, folder: cur.name }));

      const subs = await listDriveChildren(cur.id, `mimeType = 'application/vnd.google-apps.folder'`);
      subs.forEach(f => queue.push({ id: f.id, name: f.name }));
    }

    state.driveFiles = files;
    const folders = new Set(files.map(f => f.folder).filter(Boolean));
    if (!files.length) {
      setStatus(els.driveStatus, 'このフォルダに画像ファイルが見つかりませんでした（共有設定もご確認ください）。', true);
      return 0;
    }
    const more = queue.length ? `（サブフォルダが多いため${DRIVE_MAX_FOLDERS}件で打ち切りました）` : '';
    setStatus(els.driveStatus,
      `${files.length}件の画像が見つかりました${folders.size ? `（${folders.size}個のサブフォルダを含む）` : ''}${more}。取得中…`);
    return files.length;
  } catch (err) {
    console.error(err);
    setStatus(els.driveStatus, `読み込みに失敗しました: ${err.message}`, true);
    return 0;
  }
}

// 拡張子・全角半角・空白の揺れを吸収してファイル名を突き合わせる。シートには
// 「19  -Fトリミング.png」のように余分な空白が入っていることが多いため。
function normalizeFileName(name) {
  return String(name || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[\s　_]/g, '')
    .toLowerCase();
}

// シートのM列「画像リンク（ドライブ）」はURLのこともファイル名のこともあり、
// 「流れ星260814」のように作品名＋日付だけのことも多い。ファイル名で当たらない
// 場合に備えて、作品名と同名のサブフォルダも見にいく。
function findDriveFileByName(ref) {
  const target = normalizeFileName(ref);
  if (!target) return null;
  const byName = f => normalizeFileName(f.name);
  const byFolder = f => normalizeFileName(f.folder);
  return state.driveFiles.find(f => byName(f) === target) ||
         state.driveFiles.find(f => byName(f).includes(target)) ||
         state.driveFiles.find(f => target.includes(byName(f))) ||
         state.driveFiles.find(f => f.folder && byFolder(f) === target) ||
         state.driveFiles.find(f => f.folder && (byFolder(f).includes(target) || target.includes(byFolder(f)))) ||
         null;
}

async function fetchDriveImage(fileId) {
  const res = await googleApiFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  return loadImageFromBlob(await res.blob());
}

async function fetchAllArtImages() {
  const targets = state.artworks.filter(a => !a.img);
  if (!targets.length) {
    setStatus(els.driveStatus, '未取得の作品画像はありません。');
    return;
  }
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < targets.length; i++) {
    const a = targets[i];
    setStatus(els.driveStatus, `作品画像を取得中… (${i + 1}/${targets.length}) ${a.name}`);
    // シートの画像リンク列がドライブURLならそのファイルを直接、ファイル名だけなら
    // 指定フォルダの一覧から探す。どちらも当たらなければ作品名でも探してみる。
    const fileId = extractDriveFileId(a.imageRef);
    let target = fileId ? { id: fileId, name: a.imageRef } : findDriveFileByName(a.imageRef);
    if (!target) target = findDriveFileByName(a.name);
    if (!target) { a.imgStatus = 'error'; failed++; continue; }
    try {
      a.img = await fetchDriveImage(target.id);
      a.imgStatus = 'ok';
      ok++;
    } catch (err) {
      console.error(a.name, err);
      a.imgStatus = 'error';
      failed++;
    }
  }
  renderArtList();
  render();
  setStatus(els.driveStatus,
    `作品画像を${ok}件読み込みました。${failed ? `${failed}件は見つからなかったため、リストのサムネイルをクリックして個別に指定してください。` : ''}`,
    failed > 0);
}

// ---------- 描画：共通ユーティリティ ----------

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// 用紙・パネルの寸法をまとめて返す。dpiだけ差し替えれば、プレビューと入稿用
// 書き出しで完全に同じレイアウトが出る。
function geometry(dpi) {
  const k = dpi / 25.4;                       // 1mmあたりのピクセル数
  const bleed = clamp(Number(els.bleed.value) || 0, 0, 10);
  const widths = els.foldType.value === 'roll' ? [99.5, 99.5, 98] : [99, 99, 99];
  return {
    k, bleed, widths,
    mm: v => v * k,
    W: Math.round((SHEET_W_MM + bleed * 2) * k),
    H: Math.round((SHEET_H_MM + bleed * 2) * k),
    ox: bleed * k,   // 塗り足しぶんの原点オフセット（＝仕上がり左上）
    oy: bleed * k
  };
}

// 面ごとのパネル矩形（仕上がり座標系）。内面は左から C1/C2/C3、
// 外面は左右反転して刷るので左から C3/C2/C1 になる。
function panelRects(g, face) {
  const widths = face === 'inner' ? g.widths : g.widths.slice().reverse();
  const roles = face === 'inner' ? ['c1', 'c2', 'c3'] : ['c3', 'c2', 'c1'];
  const rects = [];
  let x = 0;
  widths.forEach((w, i) => {
    rects.push({ role: roles[i], x: g.ox + g.mm(x), w: g.mm(w), y: g.oy, h: g.mm(SHEET_H_MM), mmW: w });
    x += w;
  });
  return rects;
}

// 文字を「行に分けられる最小単位」に切る。日本語は1文字ずつ、英数字は単語ごと。
function tokenize(text) {
  const tokens = [];
  const re = /[A-Za-z0-9@#$%&'"()\[\]{}<>+\-*/=_.,:;!?]+|\s+|[\s\S]/g;
  let m;
  while ((m = re.exec(text)) !== null) tokens.push(m[0]);
  return tokens;
}

const NO_LINE_START = '、。，．）」』】〕｝］,.)]}!?！？ー－・：；';
const NO_LINE_END = '（「『【〔｛［([{';

function wrapTokens(ctx, tokens, maxWidth) {
  const lines = [];
  let line = [];
  let width = 0;
  const flush = () => {
    if (line.length) lines.push(line);
    line = [];
    width = 0;
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '\n') { flush(); continue; }
    const w = ctx.measureText(t).width;
    if (width + w > maxWidth && line.length) {
      // 行頭に来てはいけない文字は前の行にぶら下げ、行末に来てはいけない文字は
      // 次の行に送る（簡易的な禁則処理）。
      if (NO_LINE_START.includes(t)) {
        line.push(t);
        flush();
        continue;
      }
      const last = line[line.length - 1];
      if (NO_LINE_END.includes(last)) line.pop();
      flush();
      if (NO_LINE_END.includes(last)) { line.push(last); width = ctx.measureText(last).width; }
    }
    if (/^\s+$/.test(t) && !line.length) continue;   // 行頭の空白は捨てる
    line.push(t);
    width += w;
  }
  flush();
  return lines;
}

function wrapText(ctx, text, maxWidth) {
  const paragraphs = String(text || '').split(/\r?\n/);
  const lines = [];
  paragraphs.forEach(p => {
    if (!p.trim()) { lines.push([]); return; }
    wrapTokens(ctx, tokenize(p), maxWidth).forEach(l => lines.push(l));
  });
  return lines;
}

// 折り返した行を描く。maxLines を超えるぶんは最終行の末尾に「…」を付けて捨てる。
// 戻り値は描き終わったあとのy座標（＝続けて別の要素を積める）。
function drawParagraph(ctx, text, x, y, maxWidth, fontSize, lineHeight, maxLines) {
  const lines = wrapText(ctx, text, maxWidth);
  const limit = maxLines || lines.length;
  const shown = lines.slice(0, limit);
  shown.forEach((line, i) => {
    let str = line.join('');
    if (i === limit - 1 && lines.length > limit) {
      while (str && ctx.measureText(str + '…').width > maxWidth) str = str.slice(0, -1);
      str += '…';
    }
    ctx.fillText(str, x, y + fontSize + i * lineHeight);
  });
  return y + (shown.length ? fontSize + (shown.length - 1) * lineHeight : 0);
}

// 1行に収まるまでフォントサイズを落として描く（タイトル・価格など折り返したくない要素用）。
function drawFitted(ctx, text, x, y, maxWidth, fontSize, fontFamily, weight) {
  let size = fontSize;
  ctx.font = `${weight || 400} ${size}px ${fontFamily}`;
  while (size > 4 && ctx.measureText(text).width > maxWidth) {
    size -= Math.max(0.5, size * 0.04);
    ctx.font = `${weight || 400} ${size}px ${fontFamily}`;
  }
  ctx.fillText(text, x, y + size);
  return size;
}

// 画像を枠の中に「はみ出させずに」中央配置する（contain）。作品画像は
// トリミングしてはいけないので、cover ではなく contain を使う。
function drawContained(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return;
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// 背景画像は枠を埋める（cover）。表紙の敷き画像用。
function drawCovered(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return;
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}


function colors() {
  return { bg: els.colBg.value, text: els.colText.value, accent: els.colAccent.value };
}

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// ---------- 描画：トンボ・折りガイド ----------

function drawTrimMarks(ctx, g) {
  if (!els.showTrim.checked || g.bleed <= 0) return;
  const len = Math.min(g.mm(g.bleed), g.mm(5));
  const lw = Math.max(1, g.mm(0.15));
  const trimW = g.mm(SHEET_W_MM);
  const trimH = g.mm(SHEET_H_MM);
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lw;
  const corner = (cx, cy, dx, dy) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx * len, cy);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + dy * len);
    ctx.stroke();
  };
  corner(g.ox, g.oy, -1, -1);
  corner(g.ox + trimW, g.oy, 1, -1);
  corner(g.ox, g.oy + trimH, -1, 1);
  corner(g.ox + trimW, g.oy + trimH, 1, 1);
  ctx.restore();
}

function drawFoldGuides(ctx, g, rects) {
  if (!els.showFold.checked) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,120,255,.5)';
  ctx.lineWidth = Math.max(1, g.mm(0.2));
  ctx.setLineDash([g.mm(3), g.mm(2)]);
  for (let i = 0; i < rects.length - 1; i++) {
    const x = rects[i].x + rects[i].w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, g.H);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- 描画：内面（LIST） ----------

// 「掲載する」にチェックが入っている作品だけを、リストの並び順どおりに返す。
function visibleArtworks() {
  return state.artworks.filter(a => a.include);
}

// 作品が1件も無いときは、レイアウトが見えるようにダミーの枠を並べる。
function placeholderArtworks(count) {
  return Array.from({ length: count }, (_, i) => ({
    name: `作品名 ${i + 1}`, artist: 'アーティスト名', size: '000 × 000 mm',
    priceIn: '¥000,000', priceEx: '', edition: '', material: '', code: '', desc: '',
    img: null, placeholder: true
  }));
}

function drawInner(ctx, g) {
  const c = colors();
  const rects = panelRects(g, 'inner');
  const items = visibleArtworks();
  const list = items.length ? items : placeholderArtworks(Number(els.colsPerPanel.value) * 3 * 2);

  const outerMargin = g.mm(9);
  const foldMargin = g.mm(7);
  const topMargin = g.mm(11);
  const bottomMargin = g.mm(11);

  // 見出し（左端パネルの上）。既存リーフレット（パトレイバー）に合わせ、
  // 角のカギ括弧マーク → 大きなLIST → QRと「ご購入はこちら」→ 注意書き、の順に組む。
  const head = rects[0];
  ctx.textBaseline = 'alphabetic';
  const gridTop = drawListHeader(ctx, g, head, outerMargin, topMargin, c);

  // 下部に「アーティスト紹介」と「LIST面のQR」の帯を確保してから、残りを作品グリッドに割る。
  // QRは最終パネルの右下に置くので、紹介文と両方ある場合は紹介文の最終段を
  // QRのぶんだけ細くして重ならないようにする。
  const hasBio = els.showArtistBio.checked && (els.artistBioText.value.trim() || els.artistBioName.value.trim());
  let gridBottom = g.oy + g.mm(SHEET_H_MM) - bottomMargin;

  if (hasBio) {
    const bioH = g.mm(34);
    const bioTop = gridBottom - bioH;
    drawArtistBio(ctx, g, rects, bioTop, bioH, outerMargin, foldMargin, 0);
    gridBottom = bioTop - g.mm(6);
  }

  // 列の枠を作る（パネル単位で列を割るので、カードが折り位置をまたがない）
  const colsPerPanel = Number(els.colsPerPanel.value) || 2;
  const colGap = g.mm(4.5);
  const columns = [];
  rects.forEach((r, pi) => {
    const left = r.x + (pi === 0 ? outerMargin : foldMargin);
    const right = r.x + r.w - (pi === rects.length - 1 ? outerMargin : foldMargin);
    const usable = right - left;
    const colW = (usable - colGap * (colsPerPanel - 1)) / colsPerPanel;
    for (let i = 0; i < colsPerPanel; i++) columns.push({ x: left + i * (colW + colGap), w: colW });
  });

  const totalCols = columns.length;
  const rows = Math.max(1, Math.ceil(list.length / totalCols));
  const gridH = gridBottom - gridTop;
  const rowGap = g.mm(5);
  // 行の高さは「間延びさせない上限」と「文字が読める下限」の間に収める。
  // 下限を切ってまで詰め込むと版として使えないので、その場合は入りきらない
  // ぶんを描かず、パネル側に警告を出して列数か掲載点数で調整してもらう。
  const naturalRowH = columns[0].w * 1.55;
  const minRowH = columns[0].w * 1.15;
  const rowH = clamp((gridH - rowGap * (rows - 1)) / rows, minRowH, naturalRowH);

  let drawn = 0;
  list.forEach((a, i) => {
    const col = columns[i % totalCols];
    const row = Math.floor(i / totalCols);
    const y = gridTop + row * (rowH + rowGap);
    if (y + rowH > gridBottom + g.mm(1)) return;   // 入りきらないぶんは描かない
    drawArtCard(ctx, g, a, col.x, y, col.w, rowH, c);
    drawn++;
  });

  // 警告はキャンバスではなく操作パネル側に出す（印刷データに文字が乗らないように）。
  setStatus(els.layoutWarning,
    items.length && drawn < list.length
      ? `※ ${list.length - drawn}件が紙面に入りきっていません。列数を増やすか、掲載する作品を減らしてください。`
      : '',
    true);

}

// 作品カード1枚ぶんの文字組みを、実際に折り返した行数まで含めて先に確定させる。
// 「載せる項目」の組み合わせと列数によって必要な高さが大きく変わるので、
// 高さを先に測ってから画像の高さを決めないと、文字が次の行のカードに
// かぶってしまう（列数を3にしたときに実際に起きた）。
// drop には省いてよい項目を優先度の低い順に渡す。
function buildCardPlan(ctx, g, a, w, c, drop) {
  const colWmm = w / g.k;
  const nameSize = g.mm(clamp(colWmm * 0.088, 2.6, 4.0));
  const metaSize = g.mm(clamp(colWmm * 0.070, 2.1, 3.0));
  const priceSize = g.mm(clamp(colWmm * 0.078, 2.3, 3.2));
  const skip = key => drop.includes(key);
  const blocks = [];

  const push = (key, text, opts) => {
    if (!text || skip(key)) return;
    ctx.font = opts.font;
    const lines = Math.min(wrapText(ctx, text, w).length, opts.maxLines);
    blocks.push({
      text, font: opts.font, color: opts.color, size: opts.size,
      lineH: opts.lineH, maxLines: opts.maxLines, lines,
      gapAfter: opts.gapAfter, fit: !!opts.fit,
      height: opts.size + (lines - 1) * opts.lineH
    });
  };

  if (els.fldCode.checked) {
    push('code', a.code, {
      font: `600 ${metaSize * 0.9}px ${FONT_EN}`, color: c.accent,
      size: metaSize * 0.9, lineH: metaSize * 1.2, maxLines: 1, gapAfter: g.mm(1.0)
    });
  }
  push('name', a.name, {
    font: `700 ${nameSize}px ${FONT_JP}`, color: c.text,
    size: nameSize, lineH: nameSize * 1.28, maxLines: 2, gapAfter: g.mm(1.2)
  });
  if (els.fldArtist.checked) {
    push('artist', a.artist, {
      font: `500 ${metaSize}px ${FONT_JP}`, color: withAlpha(c.text, .72),
      size: metaSize, lineH: metaSize * 1.3, maxLines: 1, gapAfter: g.mm(0.8)
    });
  }
  if (els.fldDesc.checked) {
    push('desc', a.desc, {
      font: `400 ${metaSize * 0.92}px ${FONT_JP}`, color: withAlpha(c.text, .62),
      size: metaSize * 0.92, lineH: metaSize * 1.3, maxLines: 3, gapAfter: g.mm(0.8)
    });
  }
  if (els.fldSize.checked) {
    push('size', a.size, {
      font: `400 ${metaSize}px ${FONT_JP}`, color: withAlpha(c.text, .62),
      size: metaSize, lineH: metaSize * 1.3, maxLines: 2, gapAfter: g.mm(0.4)
    });
  }
  if (els.fldMaterial.checked) {
    push('material', a.material, {
      font: `400 ${metaSize}px ${FONT_JP}`, color: withAlpha(c.text, .62),
      size: metaSize, lineH: metaSize * 1.3, maxLines: 1, gapAfter: g.mm(0.4)
    });
  }
  if (els.fldEdition.checked && a.edition) {
    push('edition', `Edition ${a.edition}`, {
      font: `400 ${metaSize}px ${FONT_JP}`, color: withAlpha(c.text, .62),
      size: metaSize, lineH: metaSize * 1.3, maxLines: 1, gapAfter: g.mm(0.4)
    });
  }
  // 価格は折り返さず、収まるまで字を詰めて必ず1行に収める。
  const prices = [];
  if (els.fldPriceEx.checked && a.priceEx) prices.push(`${a.priceEx}（税抜）`);
  if (els.fldPriceIn.checked && a.priceIn) prices.push(`${a.priceIn}（税込）`);
  prices.forEach((p, i) => {
    push('price', p, {
      font: `700 ${priceSize}px ${FONT_JP}`, color: c.text,
      size: priceSize, lineH: priceSize * 1.35, maxLines: 1, fit: true,
      gapAfter: i === 0 && prices.length > 1 ? g.mm(0.4) : 0
    });
  });
  if (blocks.length) blocks[blocks.length - 1].gapAfter = 0;

  const height = blocks.reduce((sum, b) => sum + b.height + b.gapAfter, 0);
  return { blocks, height };
}

function drawArtCard(ctx, g, a, x, y, w, h, c) {
  const gapTop = g.mm(2.6);
  const minImgH = h * 0.30;
  const preferredImgH = h * (Number(els.imageRatio.value) || 0.65);

  // 文字が入りきらない場合は、まず画像を縮め、それでも足りなければ
  // 優先度の低い項目から順に落とす（作品名と価格は必ず残す）。
  const dropOrder = ['desc', 'material', 'edition', 'size', 'artist', 'code'];
  let drop = [];
  let plan = buildCardPlan(ctx, g, a, w, c, drop);
  for (let i = 0; plan.height > h - minImgH - gapTop && i < dropOrder.length; i++) {
    drop = dropOrder.slice(0, i + 1);
    plan = buildCardPlan(ctx, g, a, w, c, drop);
  }
  const imgH = Math.max(minImgH, Math.min(preferredImgH, h - plan.height - gapTop));

  if (a.img) {
    drawContained(ctx, a.img, x, y, w, imgH);
  } else {
    ctx.save();
    ctx.strokeStyle = withAlpha(c.text, .22);
    ctx.lineWidth = Math.max(1, g.mm(0.2));
    ctx.setLineDash([g.mm(1.5), g.mm(1.5)]);
    ctx.strokeRect(x, y, w, imgH);
    ctx.restore();
  }

  ctx.textBaseline = 'alphabetic';
  let ty = y + imgH + gapTop;
  plan.blocks.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.font = b.font;
    if (b.fit) drawFitted(ctx, b.text, x, ty, w, b.size, FONT_JP, 700);
    else drawParagraph(ctx, b.text, x, ty, w, b.size, b.lineH, b.maxLines);
    ty += b.height + b.gapAfter;
  });
}

// アーティスト紹介。パネルごとの3段組にして、本文が折り位置をまたがないようにする。
// reserveRight は最終段の右側に空けておく幅（LIST面のQRを置くぶん）。
function drawArtistBio(ctx, g, rects, y, h, outerMargin, foldMargin, reserveRight) {
  const c = colors();
  ctx.save();
  ctx.strokeStyle = withAlpha(c.text, .25);
  ctx.lineWidth = Math.max(1, g.mm(0.25));
  rects.forEach((r, pi) => {
    const left = r.x + (pi === 0 ? outerMargin : foldMargin);
    const right = r.x + r.w - (pi === rects.length - 1 ? outerMargin : foldMargin);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  });
  ctx.restore();

  const nameSize = g.mm(5);
  const bodySize = g.mm(2.7);
  const lineH = bodySize * 1.65;

  // 1段目は見出しぶん本文の開始位置を下げる。
  const boxes = rects.map((r, pi) => {
    const left = r.x + (pi === 0 ? outerMargin : foldMargin);
    let right = r.x + r.w - (pi === rects.length - 1 ? outerMargin : foldMargin);
    if (pi === rects.length - 1) right -= (reserveRight || 0);
    const top = y + g.mm(4) + (pi === 0 ? nameSize + g.mm(2.5) : 0);
    return { x: left, w: Math.max(0, right - left), y: top, h: y + h - top };
  });

  ctx.fillStyle = c.text;
  ctx.font = `700 ${nameSize}px ${FONT_EN}`;
  ctx.fillText(els.artistBioName.value || '', boxes[0].x, y + g.mm(4) + nameSize);

  // 段から段へ流し込む。段幅がわずかに違うので、都度その幅で折り返し直す。
  let remaining = tokenize(els.artistBioText.value || '');
  ctx.fillStyle = withAlpha(c.text, .78);
  ctx.font = `400 ${bodySize}px ${FONT_JP}`;
  for (const box of boxes) {
    if (!remaining.length) break;
    const capacity = Math.max(0, Math.floor(box.h / lineH));
    if (!capacity) continue;
    const lines = wrapTokens(ctx, remaining, box.w);
    lines.slice(0, capacity).forEach((line, i) => {
      ctx.fillText(line.join(''), box.x, box.y + bodySize + i * lineH);
    });
    remaining = lines.slice(capacity).flat();
  }
}

// LIST面の見出しブロック。戻り値は作品グリッドを始めてよいY座標。
function drawListHeader(ctx, g, rect, outerMargin, topMargin, c) {
  const x = rect.x + outerMargin;
  const maxW = rect.w - outerMargin * 2;
  let y = rect.y + topMargin;

  const headingSize = g.mm(14);
  ctx.fillStyle = c.text;
  ctx.font = `900 ${headingSize}px ${FONT_EN}`;
  ctx.fillText(els.listHeading.value || 'LIST', x - g.mm(0.6), y + headingSize);
  y += headingSize + g.mm(6);

  // QRを左、その右に「ご購入はこちら」の囲み、囲みの下に注意書き。
  // 囲みと注意書きは毎回入れる固定要素なので、QR画像の有無に関わらず描く
  // （QR未アップロードのときだけ、置き場所が分かるよう枠を出す）。
  const qrSize = g.mm(23);
  if (state.qrList) {
    drawContained(ctx, state.qrList, x, y, qrSize, qrSize);
  } else {
    ctx.save();
    ctx.strokeStyle = withAlpha(c.text, .35);
    ctx.setLineDash([g.mm(1.5), g.mm(1.5)]);
    ctx.lineWidth = Math.max(1, g.mm(0.25));
    ctx.strokeRect(x, y, qrSize, qrSize);
    ctx.restore();
    ctx.fillStyle = withAlpha(c.text, .45);
    ctx.font = `500 ${g.mm(2.4)}px ${FONT_JP}`;
    ctx.textAlign = 'center';
    ctx.fillText('QRを', x + qrSize / 2, y + qrSize / 2 - g.mm(0.4));
    ctx.fillText('アップロード', x + qrSize / 2, y + qrSize / 2 + g.mm(3.2));
    ctx.textAlign = 'left';
  }

  const boxX = x + qrSize + g.mm(5);
  const boxW = maxW - qrSize - g.mm(5);
  const caption = els.qrListCaption.value.trim();
  let ty = y;
  if (caption && boxW > g.mm(20)) {
    const boxH = g.mm(9);
    ctx.strokeStyle = c.text;
    ctx.lineWidth = Math.max(1, g.mm(0.3));
    ctx.strokeRect(boxX, ty, boxW, boxH);
    ctx.fillStyle = c.text;
    ctx.font = `500 ${g.mm(3.2)}px ${FONT_JP}`;
    ctx.textAlign = 'center';
    ctx.fillText(caption, boxX + boxW / 2, ty + boxH / 2 + g.mm(1.2));
    ctx.textAlign = 'left';
    ty += boxH + g.mm(3);
  }

  const note = els.qrListNote.value.trim();
  if (note && boxW > g.mm(20)) {
    ctx.fillStyle = withAlpha(c.text, .8);
    ctx.font = `400 ${g.mm(2.3)}px ${FONT_JP}`;
    drawParagraph(ctx, note, boxX, ty, boxW, g.mm(2.3), g.mm(3.4), 3);
  }

  return y + qrSize + g.mm(8);
}

// ---------- 描画：外面 ----------

function drawOuter(ctx, g) {
  const c = colors();
  const rects = panelRects(g, 'outer');
  const byRole = {};
  rects.forEach(r => { byRole[r.role] = r; });
  drawBuyPanel(ctx, g, byRole.c3, c, rects);
  drawBackCoverPanel(ctx, g, byRole.c2, c, rects);
  drawCoverPanel(ctx, g, byRole.c1, c, rects);
}

// パネルの左右余白：用紙の外側にあたる側は広め、折り側は少し狭め。
function panelInsets(g, rect, rects) {
  const idx = rects.indexOf(rect);
  const outer = g.mm(9);
  const fold = g.mm(7);
  return {
    left: rect.x + (idx === 0 ? outer : fold),
    right: rect.x + rect.w - (idx === rects.length - 1 ? outer : fold)
  };
}

// ---------- 表紙テンプレート ----------
// 過去のリーフレット表紙（syoyo / サイボーグ009 / ZEENCHIN / ウルトラマン）を
// 参照して起こした4パターン。
//
// 設計上の前提: 扱う作品はA1〜A4の「縦長」が大半。したがって表紙の作品画像は
// 一切トリミングしない（drawContained）。塗り足しまで敷き詰める drawCovered を
// 使うと顔や構図が切れるので、表紙では使わないこと。
// 会期・会場は表紙には入れない（面が窮屈になるうえ、実物の表紙も入っていない
// ものが多いため）。中面のLIST側で扱う。

// 支給素材は「デザインのみ / デザイン+額装 / 物撮り(余白あり) / 物撮り(余白なし)」の
// 4種類があり、案件によってどれが来るか決まっていない。額装や枠の装飾を足すと
// 素材側の額と二重になって混乱を招くので、テンプレート側では一切装飾を描かない。
// 素材差は「地色を合わせる」「一様な余白を詰める」の2つだけで吸収する。

// 画像の四隅と辺の中点を見て、周囲が一様な色なら、その色を返す。
function detectImageBackground(img) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  let d;
  try { d = cx.getImageData(0, 0, img.width, img.height); } catch (err) { return null; }
  const px = (x, y) => {
    const i = (Math.min(img.height - 1, Math.max(0, y)) * img.width + Math.min(img.width - 1, Math.max(0, x))) * 4;
    return [d.data[i], d.data[i + 1], d.data[i + 2]];
  };
  const w = img.width - 1, h = img.height - 1;
  const pts = [px(2, 2), px(w - 2, 2), px(2, h - 2), px(w - 2, h - 2), px(w >> 1, 2), px(2, h >> 1)];
  const avg = [0, 1, 2].map(k => pts.reduce((a, p) => a + p[k], 0) / pts.length);
  const spread = Math.max(...pts.map(p => Math.max(...[0, 1, 2].map(k => Math.abs(p[k] - avg[k])))));
  if (spread > 12) return null;   // 周囲が一様でない＝地色が読めない
  return '#' + avg.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

// 画像はデザインのみのデータを前提とし、こちらでは一切加工しない。
// 額装や余白の写り込んだ素材は、運用側でデザインデータに差し替えてもらう。
function coverArtSource() {
  return state.coverImage;
}

function coverBgColor(c, dark) {
  return dark ? '#101114' : c.bg;
}

function coverBleedRect(g, rect, rects) {
  const last = rects.indexOf(rect) === rects.length - 1;
  return { x: rect.x, y: 0, w: last ? g.W - rect.x : rect.w, h: g.H };
}

// 与えられた枠に、比率を保ったまま収まる寸法を返す（切らない）。
function fitBox(img, maxW, maxH) {
  const ratio = img.width / img.height;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  return { w, h };
}

function drawCoverLogo(ctx, g, x, y, maxW, dark) {
  if (!state.logo) return 0;
  const logoW = Math.min(maxW, g.mm(34));
  const logoH = logoW * (state.logo.height / state.logo.width);
  ctx.save();
  if (dark) ctx.filter = 'invert(1) brightness(2)';
  drawContained(ctx, state.logo, x, y, logoW, logoH);
  ctx.restore();
  return logoH;
}

function drawCoverCopyright(ctx, g, x, y, fg, align) {
  const copyright = els.copyright.value.trim();
  if (!copyright) return;
  ctx.fillStyle = withAlpha(fg, .55);
  ctx.font = `400 ${g.mm(2)}px ${FONT_JP}`;
  ctx.textAlign = align || 'left';
  ctx.fillText(copyright, x, y);
  ctx.textAlign = 'left';
}

// 字送りを効かせた1行。既存表紙の欧文が字間を空けた組みなので、それに寄せる。
function drawTrackedText(ctx, text, cx, y, tracking) {
  const chars = [...text];
  const widths = chars.map(ch => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  return total;
}

// 和文の縦組み。回転が要る約物だけ倒して、それ以外は正立のまま送る。
const VERTICAL_ROTATE = new Set(['ー', '〜', '（', '）', '「', '」', '『', '』', '【', '】', '…', '―']);
function drawVerticalText(ctx, text, x, y, size, gap) {
  // 欧文は1文字ずつ縦に積むと読めないので、行ごと90度倒す（和文縦組みの通例）。
  if (/^[\x20-\x7E]+$/.test(text)) {
    const wpx = ctx.measureText(text).width;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
    return y + wpx;
  }
  let cy = y;
  for (const ch of [...text]) {
    if (VERTICAL_ROTATE.has(ch)) {
      ctx.save();
      ctx.translate(x, cy + size / 2);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(ch, x, cy + size);
      ctx.textAlign = 'left';
    }
    cy += size + gap;
  }
  return cy;
}

function coverTitleLines() {
  return (els.coverTitle.value || '').split(/\r?\n/).filter(l => l.trim());
}

// 見出しを枠内に必ず収める。長い和文タイトルは、級数を落とすより先に折り返す
// （1行に押し込もうとすると「「シグルイ」メタルキャンバスアート展」のような
// タイトルが極端に小さくなり、表紙の主役にならないため）。
// maxHeight を渡すと、その高さに収まるまで級数を落とす。
function drawCoverHeadline(ctx, lines, x, y, maxW, baseSize, family, weight, align, lineRatio, maxHeight) {
  const ratio = lineRatio || 1.28;
  let size = baseSize;
  let wrapped = [];
  for (;;) {
    ctx.font = `${weight} ${size}px ${family}`;
    wrapped = [];
    lines.forEach(line => {
      wrapText(ctx, line, maxW).forEach(w => wrapped.push(w.join('')));
    });
    const h = wrapped.length * size * ratio;
    const tooTall = maxHeight ? h > maxHeight : wrapped.length > 3;
    if (!tooTall || size <= baseSize * 0.4) break;
    size -= baseSize * 0.04;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align || 'left';
  let cy = y;
  wrapped.forEach(line => {
    ctx.fillText(line, x, cy + size);
    cy += size * ratio;
  });
  ctx.textAlign = 'left';
  return cy;
}

// A：作品主役型（syoyo）。上にタイトル、下に作品を大きく1点。
// 額縁・アーチなどの装飾は描かない。支給素材にすでに額が写っていることがあり、
// こちらで枠を足すと額が二重になって監修上の混乱を招くため。
function drawCoverHero(ctx, g, r, ins, w, c, dark) {
  const fg = dark ? '#ffffff' : c.text;
  ctx.fillStyle = coverBgColor(c, dark);
  ctx.fillRect(r.x, r.y, r.w, r.h);

  const cx = r.x + r.w / 2;
  let y = g.oy + g.mm(16);

  const lines = coverTitleLines();
  if (lines.length) {
    ctx.fillStyle = c.accent;
    y = drawCoverHeadline(ctx, [lines[0]], cx, y, w, g.mm(13), FONT_SERIF, 700, 'center', 1.2, g.mm(42));
  }
  lines.slice(1).forEach(line => {
    ctx.fillStyle = withAlpha(fg, .85);
    ctx.font = `600 ${g.mm(3)}px ${FONT_JP}`;
    ctx.textAlign = 'center';
    drawTrackedText(ctx, line, cx, y + g.mm(3), g.mm(0.8));
    ctx.textAlign = 'left';
    y += g.mm(5.6);
  });

  // 見出しのまとまりを作るアクセント罫
  ctx.fillStyle = c.accent;
  ctx.fillRect(cx - g.mm(7), y + g.mm(4), g.mm(14), Math.max(1, g.mm(0.8)));

  const artTop = y + g.mm(12);
  const artBottom = g.oy + g.mm(SHEET_H_MM) - g.mm(18);
  const art = coverArtSource();
  if (art && artBottom - artTop > g.mm(30)) {
    const box = fitBox(art, w, artBottom - artTop - g.mm(6));
    const bx = cx - box.w / 2;
    // 天は見出しから一定の間隔、地は版面の下端に寄せる。天地で中央に置くと
    // 作品が宙に浮いて見えるため。
    const by = Math.max(artTop, artBottom - g.mm(6) - box.h);
    drawContained(ctx, art, bx, by, box.w, box.h);
    drawCoverCopyright(ctx, g, bx + box.w, by + box.h + g.mm(4), fg, 'right');
  }
}

// C：和文縦組み型（サイボーグ009）。白地に作品を縦長のまま大きく置き、
// 右にアクセント色の縦組みタイトル。ロゴは下端中央。
function drawCoverVerticalJa(ctx, g, r, ins, w, c, dark) {
  const fg = dark ? '#ffffff' : c.text;
  ctx.fillStyle = coverBgColor(c, dark);
  ctx.fillRect(r.x, r.y, r.w, r.h);

  const lines = coverTitleLines();
  const top = g.oy + g.mm(16);
  const logoH = state.logo ? g.mm(9) : 0;
  const bottom = g.oy + g.mm(SHEET_H_MM) - g.mm(18) - logoH;

  // 縦組みは行の長さがそのまま高さになる。「「シグルイ」メタルキャンバスアート展」
  // のような長いタイトルは版面からはみ出すので、最長行が収まる級数まで落とす。
  const longest = lines.reduce((m, l) => Math.max(m, [...l].length), 0);
  const titleSize = longest
    ? Math.min(g.mm(7.5), (bottom - top) / (longest * 1.06))
    : g.mm(7.5);
  const titleCol = lines.length ? titleSize * 1.3 * lines.length + g.mm(3) : 0;

  let titleTop = top;
  const art = coverArtSource();
  if (art) {
    const box = fitBox(art, w - titleCol, bottom - top - g.mm(8));
    const bx = ins.left + (w - titleCol - box.w) / 2;
    const by = top + (bottom - top - box.h) / 2;
    drawContained(ctx, art, bx, by, box.w, box.h);
    drawCoverCopyright(ctx, g, bx + box.w, by + box.h + g.mm(4), fg, 'right');
    titleTop = by;   // タイトルの起点は作品の天に揃える
  }

  if (lines.length) {
    ctx.fillStyle = c.accent;
    ctx.font = `700 ${titleSize}px ${FONT_SERIF}`;
    let x = ins.right - titleSize * 0.65;
    lines.forEach(line => {
      drawVerticalText(ctx, line, x, titleTop, titleSize, g.mm(0.5));
      x -= titleSize * 1.3;
    });
  }

  if (state.logo) {
    const logoW = Math.min(w * 0.38, g.mm(28));
    drawCoverLogo(ctx, g, r.x + r.w / 2 - logoW / 2, bottom + g.mm(6), logoW, dark);
  }
}

// E：大型コンデンス型（ZEENCHIN）。左上に極太の多段タイトル、下側に作品を
// 切らずに大きく。ロゴは右上。
function drawCoverCondensed(ctx, g, r, ins, w, c, dark) {
  const fg = dark ? '#ffffff' : c.text;
  ctx.fillStyle = coverBgColor(c, dark);
  ctx.fillRect(r.x, r.y, r.w, r.h);

  let y = g.oy + g.mm(15);
  const logoW = Math.min(w * 0.28, g.mm(20));
  drawCoverLogo(ctx, g, ins.right - logoW, y, logoW, dark);

  const lines = coverTitleLines();
  const titleW = w - logoW - g.mm(5);
  if (lines.length) {
    ctx.fillStyle = c.accent;
    y = drawCoverHeadline(ctx, [lines[0]], ins.left, y, titleW, g.mm(9.5), FONT_JP, 900, 'left', 1.15, g.mm(34));
  }
  if (lines.length > 1) {
    ctx.fillStyle = fg;
    y = drawCoverHeadline(ctx, lines.slice(1), ins.left, y, w, g.mm(7), FONT_JP, 900, 'left', 1.18);
  }

  const subtitle = els.coverSubtitle.value.trim();
  if (subtitle) {
    ctx.fillStyle = withAlpha(fg, .8);
    ctx.font = `600 ${g.mm(2.9)}px ${FONT_JP}`;
    y = drawParagraph(ctx, subtitle, ins.left, y + g.mm(2), w, g.mm(2.9), g.mm(4.3), 2);
  }

  // アクセントの短い罫（既存表紙に必ずある差し色の要素）
  ctx.fillStyle = c.accent;
  ctx.fillRect(ins.left, y + g.mm(4), g.mm(16), Math.max(1, g.mm(1)));

  const artTop = y + g.mm(10);
  const artBottom = g.oy + g.mm(SHEET_H_MM) - g.mm(16);
  const art = coverArtSource();
  if (art && artBottom - artTop > g.mm(30)) {
    const box = fitBox(art, w, artBottom - artTop - g.mm(6));
    const bx = ins.left + (w - box.w) / 2;
    const by = Math.max(artTop, artBottom - g.mm(6) - box.h);
    drawContained(ctx, art, bx, by, box.w, box.h);
    drawCoverCopyright(ctx, g, bx + box.w, by + box.h + g.mm(4), fg, 'right');
  }
}

// F：ロゴロックアップ型（ウルトラマン）。作品画像を使わず、IPロゴ×GAAATロゴを
// 縦に組む。右端にアクセントの縦バー。
function drawCoverLogoLockup(ctx, g, r, ins, w, c, dark) {
  const fg = dark ? '#ffffff' : c.text;
  ctx.fillStyle = coverBgColor(c, dark);
  ctx.fillRect(r.x, r.y, r.w, r.h);

  const barW = g.mm(6);
  ctx.fillStyle = c.accent;
  ctx.fillRect(r.x + r.w - barW, g.oy + g.mm(12), barW, g.mm(SHEET_H_MM) - g.mm(24));

  const areaW = w - barW - g.mm(4);
  const cx = ins.left + areaW / 2;

  // ロックアップは「IPロゴ・×・GAAATロゴ」で1つの組み。先に総高を出して
  // 天地中央に置かないと、要素ごとに置いたときに間延びする。
  const ipBox = state.ipLogo ? fitBox(state.ipLogo, areaW * 0.78, g.mm(38)) : { w: 0, h: g.mm(10) };
  const crossH = g.mm(7);
  const gapY = g.mm(9);
  const logoW = Math.min(areaW * 0.68, g.mm(40));
  const logoH = state.logo ? logoW * (state.logo.height / state.logo.width) : 0;
  const groupH = ipBox.h + gapY + crossH + gapY + logoH;
  let gy = g.oy + (g.mm(SHEET_H_MM) - groupH) / 2 - g.mm(6);

  if (state.ipLogo) {
    drawContained(ctx, state.ipLogo, cx - ipBox.w / 2, gy, ipBox.w, ipBox.h);
  } else {
    ctx.fillStyle = withAlpha(fg, .3);
    ctx.font = `500 ${g.mm(2.8)}px ${FONT_JP}`;
    ctx.textAlign = 'center';
    ctx.fillText('IPロゴを読み込んでください', cx, gy + ipBox.h * 0.7);
    ctx.textAlign = 'left';
  }
  gy += ipBox.h + gapY;

  ctx.fillStyle = withAlpha(fg, .7);
  ctx.font = `300 ${crossH}px ${FONT_EN}`;
  ctx.textAlign = 'center';
  ctx.fillText('×', cx, gy + crossH * 0.8);
  ctx.textAlign = 'left';
  gy += crossH + gapY;

  drawCoverLogo(ctx, g, cx - logoW / 2, gy, logoW, dark);
  gy += logoH;

  const lines = coverTitleLines();
  if (lines.length) {
    ctx.fillStyle = fg;
    drawCoverHeadline(ctx, lines, cx, gy + g.mm(14), areaW, g.mm(3.6), FONT_JP, 700, 'center', 1.4);
  }
  drawCoverCopyright(ctx, g, cx, g.oy + g.mm(SHEET_H_MM) - g.mm(14), fg, 'center');
}

const COVER_RENDERERS = {
  hero: drawCoverHero,
  verticalJa: drawCoverVerticalJa,
  condensed: drawCoverCondensed,
  lockup: drawCoverLogoLockup
};

function samplePalette(img) {
  const n = 48;
  const cv = document.createElement('canvas');
  cv.width = n; cv.height = n;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0, n, n);
  let data;
  try {
    data = cx.getImageData(0, 0, n, n).data;
  } catch (err) {
    return null;   // 別オリジンの画像でCanvasが汚れている場合は諦める
  }
  let lum = 0, best = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    const r = data[i], gg = data[i + 1], b = data[i + 2];
    lum += (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
    count++;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (mx > 0) best = Math.max(best, (mx - mn) / mx);
  }
  if (!count) return null;
  return { brightness: lum / count, saturation: best };
}

// 運用しながら閾値を調整する前提の、ルールベースのたたき台。
function classifyCoverTemplate() {
  if (!state.coverImage) return state.ipLogo ? 'lockup' : 'hero';
  const p = samplePalette(state.coverImage);
  if (!p) return 'hero';
  if (p.brightness < 0.42) return 'condensed';
  if (p.saturation > 0.62) return 'verticalJa';
  return 'hero';
}

function maybeAutoSelectCoverTemplate() {
  if (!els.coverAuto.checked) return;
  els.coverTemplate.value = classifyCoverTemplate();
}

function drawCoverPanel(ctx, g, rect, c, rects) {
  const ins = panelInsets(g, rect, rects);
  const w = ins.right - ins.left;
  const r = coverBleedRect(g, rect, rects);
  const draw = COVER_RENDERERS[els.coverTemplate.value] || drawCoverHero;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  draw(ctx, g, r, ins, w, c, els.coverDark.checked);
  ctx.restore();
}

function drawBackCoverPanel(ctx, g, rect, c, rects) {
  const ins = panelInsets(g, rect, rects);
  const w = ins.right - ins.left;
  let y = g.oy + g.mm(16);

  // 既存リーフレットではこの面の頭がGAAATのロゴ（文字組みではなくロゴ画像）で、
  // その直下にタグラインが小さく入る。
  if (state.logo) {
    const logoW = Math.min(w * 0.86, g.mm(46));
    const logoH = logoW * (state.logo.height / state.logo.width);
    drawContained(ctx, state.logo, ins.left, y, logoW, logoH);
    y += logoH + g.mm(1.5);
  } else {
    ctx.fillStyle = c.text;
    const headSize = g.mm(7);
    ctx.font = `700 ${headSize}px ${FONT_EN}`;
    ctx.fillText(BOILERPLATE.about.heading, ins.left, y + headSize);
    y += headSize + g.mm(2);
  }

  ctx.fillStyle = withAlpha(c.text, .75);
  ctx.font = `500 ${g.mm(2.3)}px ${FONT_EN}`;
  y = drawParagraph(ctx, BOILERPLATE.about.lead, ins.left, y, w, g.mm(2.3), g.mm(3.4), 2) + g.mm(5);

  ctx.fillStyle = withAlpha(c.text, .8);
  ctx.font = `400 ${g.mm(2.75)}px ${FONT_JP}`;
  y = drawParagraph(ctx, BOILERPLATE.about.ja, ins.left, y, w, g.mm(2.75), g.mm(4.5), 14) + g.mm(3);

  ctx.fillStyle = withAlpha(c.text, .6);
  ctx.font = `400 ${g.mm(2.3)}px ${FONT_EN}`;
  y = drawParagraph(ctx, BOILERPLATE.about.en, ins.left, y, w, g.mm(2.3), g.mm(3.5), 10) + g.mm(8);

  ctx.strokeStyle = withAlpha(c.text, .25);
  ctx.lineWidth = Math.max(1, g.mm(0.25));
  ctx.beginPath();
  ctx.moveTo(ins.left, y);
  ctx.lineTo(ins.right, y);
  ctx.stroke();
  y += g.mm(7);

  ctx.fillStyle = c.text;
  ctx.font = `700 ${g.mm(3.8)}px ${FONT_JP}`;
  y = drawParagraph(ctx, BOILERPLATE.mca.heading, ins.left, y, w, g.mm(3.8), g.mm(5.4), 2) + g.mm(3.5);

  ctx.fillStyle = withAlpha(c.text, .8);
  ctx.font = `400 ${g.mm(2.75)}px ${FONT_JP}`;
  y = drawParagraph(ctx, BOILERPLATE.mca.ja, ins.left, y, w, g.mm(2.75), g.mm(4.5), 16) + g.mm(3);

  ctx.fillStyle = withAlpha(c.text, .6);
  ctx.font = `400 ${g.mm(2.3)}px ${FONT_EN}`;
  y = drawParagraph(ctx, BOILERPLATE.mca.en, ins.left, y, w, g.mm(2.3), g.mm(3.5), 12);

  const bottom = g.oy + g.mm(SHEET_H_MM) - g.mm(14);

  // 既存リーフレットではこの面の下端に web / EC / X / Instagram の4つのQRが
  // ラベル付きで並ぶ。アップロードされたものだけを詰めて中央に置く。
  const qrs = BRAND_QR_SLOTS
    .map(s => ({ label: s.label, img: state.qrDefaults[s.key] }))
    .filter(q => q.img);
  let qrTop = bottom;
  if (qrs.length) {
    const gap = g.mm(5);
    const size = Math.min(g.mm(9), (w - gap * (qrs.length - 1)) / qrs.length);
    const labelSize = g.mm(2.4);
    const rowW = size * qrs.length + gap * (qrs.length - 1);
    let x = ins.left + (w - rowW) / 2;
    qrTop = bottom - size;
    ctx.textAlign = 'center';
    qrs.forEach(q => {
      ctx.fillStyle = c.text;
      ctx.font = `700 ${labelSize}px ${FONT_EN}`;
      ctx.fillText(q.label, x + size / 2, qrTop - g.mm(1.8));
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, qrTop, size, size);
      drawContained(ctx, q.img, x, qrTop, size, size);
      x += size + gap;
    });
    ctx.textAlign = 'left';
    qrTop -= labelSize + g.mm(2.5);
  }

  const note = els.footNote.value.trim();
  if (note) {
    ctx.fillStyle = withAlpha(c.text, .65);
    ctx.font = `400 ${g.mm(2.4)}px ${FONT_JP}`;
    drawParagraph(ctx, note, ins.left, qrTop - g.mm(12), w, g.mm(2.4), g.mm(3.6), 3);
  }
}

function drawBuyPanel(ctx, g, rect, c, rects) {
  const ins = panelInsets(g, rect, rects);
  const w = ins.right - ins.left;
  let y = g.oy + g.mm(16);

  // 見出しは「How to buy」に緑のマーカーを敷き、右に和文を小さく添える形。
  const headSize = g.mm(5.4);
  ctx.font = `700 ${headSize}px ${FONT_EN}`;
  const headW = ctx.measureText(BOILERPLATE.buy.headingEn).width;
  ctx.fillStyle = c.accent;
  ctx.fillRect(ins.left - g.mm(0.8), y + headSize * 0.26, headW + g.mm(1.6), headSize * 0.86);
  ctx.fillStyle = c.text;
  ctx.fillText(BOILERPLATE.buy.headingEn, ins.left, y + headSize);
  ctx.font = `700 ${g.mm(3)}px ${FONT_JP}`;
  ctx.fillText(BOILERPLATE.buy.heading, ins.left + headW + g.mm(4), y + headSize - g.mm(0.3));
  y += headSize + g.mm(7);

  // 本文の級数は原本に合わせてある。小さくすると折り返し位置がずれて
  //「スマートフォ／ン」のように語中で切れるので、安易に詰めないこと。
  const numSize = g.mm(3.8);
  const jaSize = g.mm(3.8);
  const enSize = g.mm(2.8);
  const jaLine = g.mm(5.6);
  const enLine = g.mm(4.0);
  const indent = g.mm(6.2);
  const textW = w - indent;
  const illGap = g.mm(5);
  const bottom = g.oy + g.mm(SHEET_H_MM) - g.mm(16);

  // 原本では3ステップが面の高さいっぱいに配られているので、先に各ブロックの
  // 高さを測り、余った分を等間隔の空きとして割り振る。挿絵は原本から切り出した
  // 線画をそのまま貼っているので、トーンも崩れない。
  const blocks = BOILERPLATE.buy.steps.map((step, i) => {
    const ill = state.howto[i];
    let illW = 0, illH = 0;
    if (ill) {
      const ratio = ill.width / ill.height;
      illH = g.mm(30);
      illW = illH * ratio;
      const maxW = w * 0.78;
      if (illW > maxW) { illW = maxW; illH = illW / ratio; }
    }
    ctx.font = `700 ${jaSize}px ${FONT_JP}`;
    const jaLines = wrapText(ctx, step.ja, textW).length;
    ctx.font = `400 ${enSize}px ${FONT_EN}`;
    const enLines = wrapText(ctx, step.en, textW).length;
    const textH = jaSize + (jaLines - 1) * jaLine + g.mm(1.2) + enSize + (enLines - 1) * enLine;
    return { step, ill, illW, illH, h: (illH ? illH + illGap : 0) + textH };
  });

  const totalH = blocks.reduce((s, b) => s + b.h, 0);
  const gap = blocks.length > 1
    ? Math.max(g.mm(5), Math.min(g.mm(18), (bottom - y - totalH) / (blocks.length - 1)))
    : 0;

  blocks.forEach((b, i) => {
    if (b.ill) {
      drawContained(ctx, b.ill, ins.left + (w - b.illW) / 2, y, b.illW, b.illH);
      y += b.illH + illGap;
    }

    ctx.fillStyle = c.text;
    ctx.font = `700 ${numSize}px ${FONT_EN}`;
    ctx.fillText(`${i + 1}.`, ins.left, y + jaSize);

    ctx.font = `700 ${jaSize}px ${FONT_JP}`;
    let end = drawParagraph(ctx, b.step.ja, ins.left + indent, y, textW, jaSize, jaLine, 3);

    ctx.fillStyle = withAlpha(c.text, .8);
    ctx.font = `400 ${enSize}px ${FONT_EN}`;
    end = drawParagraph(ctx, b.step.en, ins.left + indent, end + g.mm(1.2), textW, enSize, enLine, 3);

    y = end + gap;
  });
}

// ---------- 描画：エントリポイント ----------

function renderFace(canvas, face, dpi) {
  const g = geometry(dpi);
  canvas.width = g.W;
  canvas.height = g.H;
  const ctx = canvas.getContext('2d');
  const c = colors();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, g.W, g.H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  if (face === 'inner') drawInner(ctx, g);
  else drawOuter(ctx, g);

  drawFoldGuides(ctx, g, panelRects(g, face));
  drawTrimMarks(ctx, g);
  return canvas;
}

let renderTimer = null;
function render() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderFace(els.canvasInner, 'inner', PREVIEW_DPI);
    renderFace(els.canvasOuter, 'outer', PREVIEW_DPI);
  }, 60);
}

// ---------- 書き出し ----------

function exportFileName(suffix) {
  const title = (els.coverTitle.value || 'leaflet').split(/\r?\n/)[0].trim() || 'leaflet';
  return `${title.replace(/[\\/:*?"<>|]/g, '_')}_リーフレット_${suffix}`;
}

function renderFaceOffscreen(face) {
  const dpi = Number(els.dpi.value) || 350;
  return renderFace(document.createElement('canvas'), face, dpi);
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

async function exportPng(face) {
  setStatus(els.exportStatus, '書き出し中…');
  await new Promise(r => setTimeout(r, 30));   // ステータス表示を先に反映させる
  try {
    const canvas = renderFaceOffscreen(face);
    downloadCanvas(canvas, exportFileName(face === 'inner' ? '内面.png' : '外面.png'));
    setStatus(els.exportStatus, `${face === 'inner' ? '内面' : '外面'}のPNGを書き出しました（${els.dpi.value}dpi）。`);
  } catch (err) {
    console.error(err);
    setStatus(els.exportStatus, `書き出しに失敗しました: ${err.message}`, true);
  }
}

async function exportPdf() {
  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFCtor) {
    setStatus(els.exportStatus, 'PDF書き出しライブラリ（jsPDF）を読み込めませんでした。ネットワークをご確認いただくか、内面／外面のPNGで書き出してください。', true);
    return;
  }
  setStatus(els.exportStatus, 'PDFを書き出し中…');
  await new Promise(r => setTimeout(r, 30));
  try {
    const bleed = clamp(Number(els.bleed.value) || 0, 0, 10);
    const pw = SHEET_W_MM + bleed * 2;
    const ph = SHEET_H_MM + bleed * 2;
    const pdf = new jsPDFCtor({ orientation: 'landscape', unit: 'mm', format: [pw, ph] });

    const inner = renderFaceOffscreen('inner');
    pdf.addImage(inner.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pw, ph);
    pdf.addPage([pw, ph], 'landscape');
    const outer = renderFaceOffscreen('outer');
    pdf.addImage(outer.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pw, ph);

    pdf.save(exportFileName('A4三つ折り.pdf'));
    setStatus(els.exportStatus, `PDFを書き出しました（1ページ目＝内面／2ページ目＝外面、${els.dpi.value}dpi）。`);
  } catch (err) {
    console.error(err);
    setStatus(els.exportStatus, `書き出しに失敗しました: ${err.message}`, true);
  }
}

// ---------- イベント ----------

els.signInBtn.addEventListener('click', requestGoogleSignIn);

els.loadSheetsBtn.addEventListener('click', () => {
  if (!state.googleAccessToken) {
    setStatus(els.sheetsStatus, '先に上の「Googleでログイン」を済ませてください。（ログインせずに使う場合は、下の貼り付け欄をお使いください）', true);
    return;
  }
  loadFromSheetsUrl(els.sheetsUrlInput.value);
});

els.applyPasteBtn.addEventListener('click', () => {
  const rows = els.pasteArea.value.split(/\r?\n/).map(line => line.split('\t'));
  const items = parseRows(rows);
  if (!items.length) {
    setStatus(els.sheetsStatus, '作品の行が見つかりませんでした。「作品名」の見出し行を含めてコピーしてください。', true);
    return;
  }
  setStatus(els.sheetsStatus, applyArtworks(items));
});

// フォルダの読み込みと画像取得は必ず続けて行うので、ボタンは分けずに一続きにする。
els.loadDriveFolderBtn.addEventListener('click', async () => {
  if (!state.googleAccessToken) {
    setStatus(els.driveStatus, '先に「Googleでログイン」を済ませてください。', true);
    return;
  }
  const folderId = extractDriveFolderId(els.driveFolderInput.value);
  if (!folderId) {
    setStatus(els.driveStatus, 'フォルダのURLまたはIDを正しく入力してください。', true);
    return;
  }
  els.loadDriveFolderBtn.disabled = true;
  try {
    const found = await loadDriveFolder(folderId);
    if (!found) return;   // 失敗・0件のときは loadDriveFolder 側が理由を出している
    if (!state.artworks.length) {
      setStatus(els.driveStatus,
        `${found}件の画像が見つかりました。先にECシートから作品を読み込むと、突き合わせて取得します。`, true);
      return;
    }
    await fetchAllArtImages();
  } finally {
    els.loadDriveFolderBtn.disabled = false;
  }
});

els.selectAllBtn.addEventListener('click', () => {
  state.artworks.forEach(a => { a.include = true; });
  renderArtList();
  render();
});
els.deselectAllBtn.addEventListener('click', () => {
  state.artworks.forEach(a => { a.include = false; });
  renderArtList();
  render();
});
els.resetOrderBtn.addEventListener('click', () => {
  if (!state.sourceOrder.length) return;
  state.artworks = state.sourceOrder.slice();
  renderArtList();
  render();
});

// 固定文言は編集できないぶん、何が刷られるのかは画面で読めるようにしておく。
function renderBoilerplatePreview() {
  const esc = s => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  const steps = BOILERPLATE.buy.steps
    .map(s => `<li>${esc(s.ja)}<br><span class="en">${esc(s.en)}</span></li>`).join('');
  els.boilerplatePreview.innerHTML = `
    <section>
      <h4>${esc(BOILERPLATE.about.heading)}（裏表紙・上段）</h4>
      <p class="en">${esc(BOILERPLATE.about.lead)}</p>
      <p>${esc(BOILERPLATE.about.ja)}</p>
      <p class="en">${esc(BOILERPLATE.about.en)}</p>
    </section>
    <section>
      <h4>${esc(BOILERPLATE.mca.heading)}（裏表紙・下段）</h4>
      <p>${esc(BOILERPLATE.mca.ja)}</p>
      <p class="en">${esc(BOILERPLATE.mca.en)}</p>
    </section>
    <section>
      <h4>${esc(BOILERPLATE.buy.headingEn)} / ${esc(BOILERPLATE.buy.heading)}（折り込み面）</h4>
      <ol>${steps}</ol>
      <p>各ステップの上に、既存リーフレットと同じ線画の挿絵が入ります。</p>
    </section>`;
}

function bindImageInput(input, key, onLoaded) {
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) { state[key] = null; if (onLoaded) onLoaded(); render(); return; }
    loadImageFromBlob(file).then(img => {
      state[key] = img;
      if (onLoaded) onLoaded();
      render();
    });
  });
}
bindImageInput(els.qrListInput, 'qrList');
bindImageInput(els.coverImageInput, 'coverImage', () => maybeAutoSelectCoverTemplate());
bindImageInput(els.ipLogoInput, 'ipLogo', () => maybeAutoSelectCoverTemplate());

els.coverTemplate.addEventListener('change', () => { els.coverAuto.checked = false; });
els.coverAuto.addEventListener('change', () => { maybeAutoSelectCoverTemplate(); render(); });

els.downloadPdfBtn.addEventListener('click', exportPdf);
els.downloadInnerBtn.addEventListener('click', () => exportPng('inner'));
els.downloadOuterBtn.addEventListener('click', () => exportPng('outer'));

// 入力欄はまとめて監視して、変更があれば描き直す。
document.querySelectorAll('#panel input, #panel textarea, #panel select').forEach(el => {
  if (el.type === 'file') return;
  el.addEventListener('input', render);
  el.addEventListener('change', render);
});

// ---------- 初期化 ----------

if (window.GAAAT_LOGO_DATA_URL) {
  const logo = new Image();
  logo.onload = () => { state.logo = logo; render(); };
  logo.src = window.GAAAT_LOGO_DATA_URL;
}

// 購入手順の挿絵を読み込む。読めなくても他の面は成立するので、
// 失敗しても描画は止めず、その枠だけ空けて進む。
BRAND_QR_SLOTS.forEach(slot => {
  const img = new Image();
  img.onload = () => { state.qrDefaults[slot.key] = img; render(); };
  img.onerror = () => console.warn(`ブランドQRが読み込めませんでした: ${slot.src}`);
  img.src = slot.src;
});

HOWTO_ILLUSTRATIONS.forEach((src, i) => {
  const img = new Image();
  img.onload = () => { state.howto[i] = img; render(); };
  img.onerror = () => console.warn(`購入手順の挿絵が読み込めませんでした: ${src}`);
  img.src = src;
});

renderBoilerplatePreview();
initGoogleAuthUI();
renderArtList();
render();

// Canvasはwebフォントの読み込み完了を待ってくれないので、初回描画は
// システムフォントで出ることがある。フォントが揃ったら描き直す
// （fonts.gstatic.com が遮断されている場合に備えてタイムアウトも置く）。
Promise.race([
  Promise.all([
    document.fonts.load(`700 100px "Noto Sans JP"`),
    document.fonts.load(`400 100px "Noto Sans JP"`),
    document.fonts.load(`700 100px "Noto Serif JP"`),
    document.fonts.load(`600 100px "Oswald"`)
  ]),
  new Promise(resolve => setTimeout(resolve, 4000))
]).then(render);
