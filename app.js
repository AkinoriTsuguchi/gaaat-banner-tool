/* GAAAT banner generator — canvas renderer + color extraction */

const CANVAS_SIZE = 1080;
const FONT_STACK = '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
// Distinctive display font for the one big headline per template (展示会タ
// イトル and the cyber-UI catchphrase). User-selectable via #titleFontSelect
// (state.titleFont) — each preset pairs a distinctive Latin display face
// with a same-mood CJK face for glyphs the Latin one doesn't cover, falling
// back to the plain system stack for scripts neither covers (e.g. Arabic) or
// if the webfonts fail to load. TITLE_FONT_STACK itself is reassigned from
// the selected preset at the top of every render() — every template just
// reads it inline, so nothing else needs to change per template.
const TITLE_FONT_PRESETS = {
  gothic: { label: '太字ゴシック（デフォルト）', stack: `"Oswald", "Noto Sans JP", ${FONT_STACK}` },
  mincho: { label: '明朝・上品', stack: `"Playfair Display", "Shippori Mincho", ${FONT_STACK}` },
  rounded: { label: '丸ゴシック・ポップ', stack: `"Fredoka", "M PLUS Rounded 1c", ${FONT_STACK}` },
  cyber: { label: 'サイバー・近未来', stack: `"Orbitron", "Noto Sans JP", ${FONT_STACK}` },
  clean: { label: 'シンプル・ゴシック', stack: `"Inter", "Noto Sans JP", ${FONT_STACK}` }
};
function getTitleFontStack() {
  const preset = TITLE_FONT_PRESETS[state.titleFont];
  return (preset || TITLE_FONT_PRESETS.gothic).stack;
}
let TITLE_FONT_STACK = TITLE_FONT_PRESETS.gothic.stack;

const LOGO_DATA_URL = "data:image/png;base64,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";

// ---------- Color extraction ----------

function quantizeStep(v, step){ return Math.round(v / step) * step; }

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function colorDistance(a, b) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function extractPalette(img) {
  const maxDim = 140;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const octx = off.getContext('2d');
  octx.drawImage(img, 0, 0, w, h);
  const data = octx.getImageData(0, 0, w, h).data;

  const buckets = new Map();
  const STEP = 16;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 200) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = quantizeStep(r, STEP) + '_' + quantizeStep(g, STEP) + '_' + quantizeStep(b, STEP);
    let bucket = buckets.get(key);
    if (!bucket) { bucket = { count: 0, r: 0, g: 0, b: 0 }; buckets.set(key, bucket); }
    bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b;
  }

  const list = Array.from(buckets.values()).map(bk => ({
    r: Math.round(bk.r / bk.count),
    g: Math.round(bk.g / bk.count),
    b: Math.round(bk.b / bk.count),
    count: bk.count
  })).sort((a, b) => b.count - a.count);

  if (list.length === 0) {
    const fallbackAccent = { r: 226, g: 87, b: 76 };
    return { bg: { r: 245, g: 243, b: 238 }, accent: fallbackAccent, accentRaw: fallbackAccent };
  }

  const bg = list[0];

  const remaining = list.slice(1).filter(c => colorDistance(c, bg) > 45);
  remaining.forEach(c => { c.hsl = rgbToHsl(c.r, c.g, c.b); });

  // Prefer vivid, colorful candidates (avoids picking black/gray ink lines
  // as the "accent" just because they are frequent).
  const vivid = remaining.filter(c => c.hsl.s > 0.28 && c.hsl.l > 0.15 && c.hsl.l < 0.9);

  let accent;
  const pool = vivid.length > 0 ? vivid : remaining;
  if (pool.length === 0) {
    // fallback: derive an accent by shifting hue/lightness of bg
    const hsl = rgbToHsl(bg.r, bg.g, bg.b);
    accent = hslToRgbObj((hsl.h + 0.5) % 1, Math.max(0.55, hsl.s), 0.5);
  } else {
    pool.forEach(c => { c.score = c.count * Math.pow(c.hsl.s, 1.4); });
    pool.sort((a, b) => b.score - a.score);
    accent = pool[0];
  }

  // accentRaw keeps the un-normalized color so callers can still read its
  // real saturation — vividizeAccent() below always floors saturation to
  // 0.6, which would otherwise erase that signal (used by template
  // auto-selection to detect genuinely monotone/ink-toned artwork).
  return {
    bg: { r: bg.r, g: bg.g, b: bg.b },
    accent: vividizeAccent({ r: accent.r, g: accent.g, b: accent.b }),
    accentRaw: { r: accent.r, g: accent.g, b: accent.b }
  };
}

// Extracted accents from real artwork are often pastel/muted (a small patch of
// color among lots of paper and ink). Push saturation/lightness into a punchy
// range while keeping the original hue, so the banner reads as a confident
// brand color instead of a washed-out swatch.
function vividizeAccent(rgb) {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const s = Math.max(hsl.s, 0.6);
  const l = Math.min(Math.max(hsl.l, 0.42), 0.56);
  return hslToRgbObj(hsl.h, s, l);
}

// Rule-based template picker from the extracted palette, per the
// "世界観の自動選択ロジック" table in docs/layout-templates.md.
//
// `accent` is the vividized accent (extractPalette().accent) — vividizeAccent()
// always floors it to s>=0.6 / l in [0.42,0.56], so only its HUE carries any
// signal here. `accentRaw` is the un-normalized accent (extractPalette().accentRaw)
// and is what actually tells us whether the artwork is colorful or
// monotone/ink-toned — most banner backgrounds are plain white regardless of
// genre, so bg saturation alone isn't a reliable "monotone" signal.
function classifyTemplateFromPalette(bg, accent, accentRaw) {
  const bgHsl = rgbToHsl(bg.r, bg.g, bg.b);
  const accentHsl = rgbToHsl(accent.r, accent.g, accent.b);
  const rawHsl = rgbToHsl(accentRaw.r, accentRaw.g, accentRaw.b);
  const hueDeg = accentHsl.h * 360;
  const isWarmHue = hueDeg <= 50 || hueDeg >= 330;
  const isCoolHue = hueDeg >= 170 && hueDeg <= 255;

  // モノトーン・和紙質感・墨系 → 縦書きタイトル型
  // (even the most vivid secondary color in the artwork is barely saturated)
  if (rawHsl.s < 0.15) return 'vertical2';
  // 暗色・重厚 → スポットライト型（色相を問わずドラマチックな方が合う）
  if (bgHsl.l < 0.32) return 'frame4';
  // 暖色系・彩度高め・ポップ → キャラクター切り抜き型
  if (isWarmHue && bgHsl.l > 0.55) return 'cutout1';
  // 寒色・デジタル感 → サイバーUI型
  if (isCoolHue) return 'cyberui5';
  // 特に指定なし・汎用 → ギャラリー型（デフォルト）
  return 'frame3';
}

function hslToRgbObj(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function relLuminance({ r, g, b }) {
  const chan = v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(c1, c2) {
  const l1 = relLuminance(c1) + 0.05;
  const l2 = relLuminance(c2) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

function pickTextColor(bg) {
  const black = { r: 17, g: 17, b: 17 };
  const white = { r: 255, g: 255, b: 255 };
  return contrastRatio(bg, black) >= contrastRatio(bg, white) ? black : white;
}

function rgbStr(c) { return `rgb(${c.r},${c.g},${c.b})`; }
function rgbToHex(c) {
  const h = v => v.toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Renders an <input type="date"> value ("YYYY-MM-DD") as "MM.DD (Weekday)"
// using the target language's locale, so a single stored date prints
// correctly (weekday name + script) for every language the banner supports.
function formatBannerDate(isoDate, lang) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(Date.UTC(y, m - 1, d));
  const locale = LANGUAGE_LOCALES[lang] || 'en-US';
  const md = `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
  let weekday = '';
  try {
    weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date);
  } catch (e) {
    weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date);
  }
  return `${md} (${weekday})`;
}

// Wraps an already-formatted date (formatBannerDate's output) with a
// "until <date>" phrase per language, for the single deadline-style date
// online-sale banners show (no start date — see buildInfoLineParts). A
// bare "08.24 (Mon)" doesn't say what the date IS; this makes the sale
// end date read the same way regardless of language. Only applied to the
// auto-formatted date — a free-text dateOverride is used as-is verbatim.
const SALE_DEADLINE_PREFIX = {
  ja: '', en: 'Until ', 'zh-Hans': '至', 'zh-Hant': '至', fr: "Jusqu'au ",
  ar: 'حتى ', es: 'Hasta ', pt: 'Até ', de: 'Bis ', it: 'Fino al '
};
const SALE_DEADLINE_SUFFIX = { ja: 'まで' };
function formatSaleDeadline(dateLabel, lang) {
  if (!dateLabel) return '';
  const prefix = SALE_DEADLINE_PREFIX[lang] ?? SALE_DEADLINE_PREFIX.en;
  const suffix = SALE_DEADLINE_SUFFIX[lang] ?? '';
  return `${prefix}${dateLabel}${suffix}`;
}

// ---------- App state ----------

// Languages the venue/date/copyright master never has per-language text for
// (those stay shared). Title / main copy / sub copy are creative text and
// are kept as separate drafts per language below.
const LANGUAGE_LABELS = {
  ja: '日本語', en: 'English', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文',
  fr: 'Français', ar: 'العربية', es: 'Español', pt: 'Português',
  de: 'Deutsch', it: 'Italiano'
};
const LANGUAGE_LOCALES = {
  ja: 'ja-JP', en: 'en-US', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW',
  fr: 'fr-FR', ar: 'ar-SA', es: 'es-ES', pt: 'pt-PT', de: 'de-DE', it: 'it-IT'
};
// Google Cloud Translation wants bare language codes (no region), except for
// Chinese where the region IS the only way to say "simplified" vs
// "traditional" — 'zh-CN'/'zh-TW' happen to already be exactly what
// LANGUAGE_LOCALES has for those two, so this only needs to special-case them.
function translateLangCode(appLangCode) {
  if (appLangCode === 'zh-Hans') return 'zh-CN';
  if (appLangCode === 'zh-Hant') return 'zh-TW';
  return appLangCode.split('-')[0];
}

const state = {
  artImage: null,
  logoImage: null,
  colors: {
    bg: { r: 245, g: 243, b: 238 },
    accent: { r: 226, g: 87, b: 76 },
    accentRaw: { r: 226, g: 87, b: 76 }
  },
  languages: ['ja', 'en'],
  currentLang: 'ja',
  template: 'current',
  // Which TITLE_FONT_PRESETS entry the title (and cyberUI5's catchphrase)
  // renders in — a project-wide design choice like the template/colors, not
  // per-language content, so it isn't part of state.drafts.
  titleFont: 'gothic',
  // "1行に収める" toggles — force a single shrink-to-fit line instead of
  // auto-wrapping to 2 lines. Project-wide formatting choices like
  // titleFont, not per-language content, so not part of state.drafts.
  titleNoWrap: false,
  mainCopyNoWrap: false,
  // 'venue' = 来場促進(集客用), 'sale' = オンライン販売用
  bannerPurpose: 'venue',
  googleAccessToken: null,
  // Which field groups vary per language vs. stay shared across all
  // languages — see LANG_FIELD_GROUPS below. Default: all per-language.
  langSpecific: { title: true, mainCopy: true, subCopy: true, copyright: true, extraText: true, saleTag: true },
  // per-language text, one key per LANG_FIELD_GROUPS field currently
  // toggled on: { [lang]: { title, dateStart, dateEnd, venue, mainCopy, subCopy, copyright } }
  drafts: {},
  // For each non-source language + TRANSLATION_CHECK_GROUPS field, the
  // source-language text that field's current translation was last written
  // against — either by autoTranslateUntranslated() or by hand-editing the
  // field while viewing that language. Lets scanStaleTranslations() tell "翻訳
  // 済みだが原文が後から変更された" apart from "そもそも未翻訳"（which
  // scanTranslationGaps() already catches by comparing text across
  // languages）: a translation with no snapshot here was never
  // translated/confirmed at all, so scanTranslationGaps' identical-text check
  // is what flags it, not this. Shape: { [lang]: { [fieldName]: sourceText } }.
  translationSnapshots: {},
  // Per-project manual fine-tuning (版元 feedback like "make the logo
  // bigger" or "shift the art crop") — layered on top of the template's own
  // layout math rather than edited into the template code, since this kind
  // of request varies project to project and a code change would leak into
  // every other project using the same template. Shared across all
  // languages/sessions in this project so it survives 一括生成 (batch
  // generation) automatically. scale is a percentage (100 = unchanged); dx/dy
  // are pixel offsets in the 1080×1080 canvas (positive = right/down). Not
  // persisted across a page reload, same as every other field here.
  adjustments: {
    logo: { scale: 100, dx: 0, dy: 0, hidden: false },
    copyright: { scale: 100, dx: 0, dy: 0, hidden: false },
    title: { scale: 100, dx: 0, dy: 0, hidden: false },
    mainCopy: { scale: 100, dx: 0, dy: 0, hidden: false },
    subCopy: { scale: 100, dx: 0, dy: 0, hidden: false },
    art: { scale: 100, dx: 0, dy: 0, hidden: false },
    dates: { scale: 100, dx: 0, dy: 0, hidden: false },
    extraText: { scale: 100, dx: 0, dy: 0, hidden: false },
    // Only ever populated in sale mode, by the price pill (see
    // drawSaleBadges) — plain venue-name text has never been individually
    // adjustable and still isn't. Named after the 'venue' layer it shares,
    // same precedent as 'logo' sharing the 'decoration' layer.
    venue: { scale: 100, dx: 0, dy: 0, hidden: false },
    // Sale-tag pill (see drawSaleBadges). Kept separate from 'dates' —
    // once end dates became optional-but-showable again in sale mode, the
    // venue/date info line and the sale-tag pill can appear at the same
    // time, so they need independent drag boxes and hide toggles.
    saleTag: { scale: 100, dx: 0, dy: 0, hidden: false }
  }
};

// Safe accessor for state.adjustments — returns the neutral default if a
// key is somehow missing instead of throwing, so a template can always do
// `const a = adj('title')` without an existence check first.
function adj(key) {
  return state.adjustments[key] || { scale: 100, dx: 0, dy: 0, hidden: false };
}

// Bounding box (in native 1080×1080 canvas space) of each adjustable
// element's most recent render — populated by recordBounds() calls sprinkled
// through the 6 template functions, reset at the top of every render(). This
// is what the drag/scroll interaction layer hit-tests against, so dragging
// always grabs whatever's actually on screen right now regardless of
// content length, language, or template.
state.elementBounds = {};
const ADJUSTMENT_LABELS = {
  logo: 'ロゴ', copyright: 'コピーライト', title: 'タイトル',
  mainCopy: 'メインコピー', subCopy: 'サブコピー', art: '素材', dates: '会期情報',
  extraText: '追加テキスト', venue: '価格バッジ（オンライン販売用）',
  saleTag: 'セールタグバッジ（オンライン販売用）'
};
function recordBounds(key, x, y, w, h) {
  state.elementBounds[key] = { x, y, w, h };
}

const canvas = document.getElementById('banner');
const canvasWrap = document.getElementById('canvasWrap');
const realCtx = canvas.getContext('2d'); // the true composite surface — what's on screen and what the normal PNG download reads

// ---------- Layer system (for レイヤー分け出力) ----------
// Every template draws through `ctx` as before — that name still exists,
// but it's now a Proxy that transparently forwards every get/set to
// whichever offscreen layer canvas is "active" at that point in the
// drawing code. This lets each template's existing draw calls (fillRect,
// fillText, drawImage, gradients, ...) end up on the right named layer
// just by sprinkling `useLayer('name')` calls at existing section
// boundaries, with zero changes to the drawing calls themselves.
// After a template function returns, compositeLayers() flattens the
// layers onto the real canvas in stacking order — exactly reproducing the
// single-canvas output every template already produces, just built up
// from separable pieces along the way.
// Text is split one layer per input field (matching the "テキスト項目" panel)
// rather than one combined "text" layer, so each piece of copy can be
// hidden/edited/translated independently once opened in Photoshop.
const LAYER_ORDER = ['background', 'artwork', 'decoration', 'title', 'dates', 'venue', 'saleTag', 'mainCopy', 'subCopy', 'copyright', 'extraText'];
const LAYER_LABELS = {
  background: '背景', artwork: '素材', decoration: '装飾',
  title: '展示会タイトル', dates: '会期情報', venue: '開催会場名',
  saleTag: 'セールタグバッジ',
  mainCopy: 'メインコピー', subCopy: 'サブコピー', copyright: 'コピーライト',
  extraText: '追加テキスト'
};
let layers = {};
let activeCtx = null;

function createLayers() {
  layers = {};
  LAYER_ORDER.forEach(name => {
    const c = document.createElement('canvas');
    c.width = CANVAS_SIZE;
    c.height = CANVAS_SIZE;
    layers[name] = { canvas: c, ctx: c.getContext('2d') };
  });
  activeCtx = layers.background.ctx;
}

function useLayer(name) {
  if (!layers[name]) throw new Error(`Unknown layer: ${name}`);
  activeCtx = layers[name].ctx;
}

// Most adjustable categories map 1:1 onto their own dedicated layer (see
// LAYER_ORDER above), so "hide this element" for the flattened PNG/preview
// is just "don't composite that layer" — the layer's own canvas still has
// its pixels drawn (recordBounds() still runs, so it stays draggable, and
// the レイヤー分けZIP/PSD export — which reads layers[name] directly, not
// this composite — still includes it for manual re-enabling in Photoshop).
// 'logo' has no dedicated layer (it shares 'decoration' with bands/scrims/
// brackets that must never hide), so it's handled separately at each of its
// draw sites instead.
const LAYER_TO_ADJUSTMENT = {
  title: 'title', dates: 'dates', mainCopy: 'mainCopy', subCopy: 'subCopy',
  copyright: 'copyright', artwork: 'art', extraText: 'extraText', saleTag: 'saleTag'
};

function compositeLayers() {
  realCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  LAYER_ORDER.forEach(name => {
    const cat = LAYER_TO_ADJUSTMENT[name];
    if (cat && adj(cat).hidden) return;
    realCtx.drawImage(layers[name].canvas, 0, 0);
  });
}

const ctx = new Proxy({}, {
  get(_target, prop) {
    const v = activeCtx[prop];
    return typeof v === 'function' ? v.bind(activeCtx) : v;
  },
  set(_target, prop, value) {
    activeCtx[prop] = value;
    return true;
  }
});

const els = {
  artFile: document.getElementById('artFile'),
  bgPicker: document.getElementById('bgColorPicker'),
  accentPicker: document.getElementById('accentColorPicker'),
  textPicker: document.getElementById('textColorPicker'),
  resetColors: document.getElementById('resetColorsBtn'),
  title: document.getElementById('titleField'),
  titleFontSelect: document.getElementById('titleFontSelect'),
  titleNoWrapToggle: document.getElementById('titleNoWrapToggle'),
  mainCopyNoWrapToggle: document.getElementById('mainCopyNoWrapToggle'),
  dateStart: document.getElementById('dateStart'),
  dateEnd: document.getElementById('dateEnd'),
  dateOverride: document.getElementById('dateOverrideField'),
  venue: document.getElementById('venueField'),
  mainCopy: document.getElementById('mainCopyField'),
  subCopy: document.getElementById('subCopyField'),
  copyright: document.getElementById('copyrightField'),
  extraText: document.getElementById('extraTextField'),
  priceField: document.getElementById('priceField'),
  priceFieldLabel: document.getElementById('priceFieldLabel'),
  priceFieldHint: document.getElementById('priceFieldHint'),
  saleTag: document.getElementById('saleTagField'),
  saleTagFieldLabel: document.getElementById('saleTagFieldLabel'),
  saleTagHint: document.getElementById('saleTagHint'),
  dateFieldLabel: document.getElementById('dateFieldLabel'),
  dateFieldHint: document.getElementById('dateFieldHint'),
  dateStartWrap: document.getElementById('dateStartWrap'),
  venueFieldLabel: document.getElementById('venueFieldLabel'),
  venueFieldHint: document.getElementById('venueFieldHint'),
  sessionMasterFieldset: document.getElementById('sessionMasterFieldset'),
  subCopyFieldLabel: document.getElementById('subCopyFieldLabel'),
  bannerPurposeSelect: document.getElementById('bannerPurposeSelect'),
  bannerPurposeHint: document.getElementById('bannerPurposeHint'),
  driveSetupNote: document.getElementById('driveSetupNote'),
  driveSignInBtn: document.getElementById('driveSignInBtn'),
  driveFolderRow: document.getElementById('driveFolderRow'),
  driveFolderInput: document.getElementById('driveFolderInput'),
  driveLoadFolderBtn: document.getElementById('driveLoadFolderBtn'),
  driveStatus: document.getElementById('driveStatus'),
  driveFileGrid: document.getElementById('driveFileGrid'),
  download: document.getElementById('downloadBtn'),
  downloadLayersZipBtn: document.getElementById('downloadLayersZipBtn'),
  downloadPsdBtn: document.getElementById('downloadPsdBtn'),
  layerExportStatus: document.getElementById('layerExportStatus'),
  sheetsSetupNote: document.getElementById('sheetsSetupNote'),
  sheetsSignInBtn: document.getElementById('sheetsSignInBtn'),
  sheetsAuthStatus: document.getElementById('sheetsAuthStatus'),
  sheetsUrlInput: document.getElementById('sheetsUrlInput'),
  loadSheetsBtn: document.getElementById('loadSheetsBtn'),
  sheetsStatus: document.getElementById('sheetsStatus'),
  pasteArea: document.getElementById('pasteArea'),
  parsePasteBtn: document.getElementById('parsePasteBtn'),
  venueSelect: document.getElementById('venueSelect'),
  pasteStatus: document.getElementById('pasteStatus'),
  langBar: document.getElementById('langBar'),
  addLangSelect: document.getElementById('addLangSelect'),
  addLangBtn: document.getElementById('addLangBtn'),
  langToggle_title: document.getElementById('langToggle_title'),
  langToggle_mainCopy: document.getElementById('langToggle_mainCopy'),
  langToggle_subCopy: document.getElementById('langToggle_subCopy'),
  langToggle_copyright: document.getElementById('langToggle_copyright'),
  langToggle_extraText: document.getElementById('langToggle_extraText'),
  langToggle_saleTag: document.getElementById('langToggle_saleTag'),
  templateSelect: document.getElementById('templateSelect'),
  autoTemplateCheckbox: document.getElementById('autoTemplateCheckbox'),
  sessionChecklist: document.getElementById('sessionChecklist'),
  previewBatchBtn: document.getElementById('previewBatchBtn'),
  batchPreviewOverlay: document.getElementById('batchPreviewOverlay'),
  batchPreviewGrid: document.getElementById('batchPreviewGrid'),
  batchPreviewStatus: document.getElementById('batchPreviewStatus'),
  closeBatchPreviewBtn: document.getElementById('closeBatchPreviewBtn'),
  exportPreviewOverlay: document.getElementById('exportPreviewOverlay'),
  exportPreviewGrid: document.getElementById('exportPreviewGrid'),
  exportPreviewStatus: document.getElementById('exportPreviewStatus'),
  closeExportPreviewBtn: document.getElementById('closeExportPreviewBtn'),
  cancelExportBtn: document.getElementById('cancelExportBtn'),
  confirmExportBtn: document.getElementById('confirmExportBtn'),
  batchGenerateBtn: document.getElementById('batchGenerateBtn'),
  batchStatus: document.getElementById('batchStatus'),
  batchHint: document.getElementById('batchHint'),
  batchLangSummary: document.getElementById('batchLangSummary'),
  translationWarningHint: document.getElementById('translationWarningHint'),
  autoTranslateBtn: document.getElementById('autoTranslateBtn'),
  autoTranslateStatus: document.getElementById('autoTranslateStatus'),
  resetAdjustmentsBtn: document.getElementById('resetAdjustmentsBtn'),
  undoAdjustmentsBtn: document.getElementById('undoAdjustmentsBtn'),
  redoAdjustmentsBtn: document.getElementById('redoAdjustmentsBtn'),
  adjustPresetSelect: document.getElementById('adjustPresetSelect'),
  loadAdjustPresetBtn: document.getElementById('loadAdjustPresetBtn'),
  deleteAdjustPresetBtn: document.getElementById('deleteAdjustPresetBtn'),
  adjustPresetNameInput: document.getElementById('adjustPresetNameInput'),
  saveAdjustPresetBtn: document.getElementById('saveAdjustPresetBtn'),
  adjustPresetStatus: document.getElementById('adjustPresetStatus'),
  adjustHighlight: document.getElementById('adjustHighlight'),
  adjustHighlightLabel: document.getElementById('adjustHighlightLabel'),
  centerGuideV: document.getElementById('centerGuideV'),
  centerGuideH: document.getElementById('centerGuideH')
};

function syncColorPickers() {
  els.bgPicker.value = rgbToHex(state.colors.bg);
  els.accentPicker.value = rgbToHex(state.colors.accent);
  const auto = pickTextColor(state.colors.bg);
  els.textPicker.value = rgbToHex(state.textOverride || auto);
}

// ---------- Banner purpose (集客用 / オンライン販売用) ----------
// The venue/date fields double as "store name / sale period" in sale mode —
// same inputs, just relabeled — plus one dedicated price field. This keeps
// the data model small while letting every template surface purchase intent
// without a parallel set of sale-only fields.

function applyBannerPurposeUI() {
  const isSale = state.bannerPurpose === 'sale';
  // Sale banners don't use a venue/site name (GAAAT's actual EC banners
  // never show one, and it's not something marketing asked to keep) — the
  // whole field is hidden rather than relabeled.
  els.venueFieldLabel.style.display = isSale ? 'none' : '';
  els.venue.style.display = isSale ? 'none' : '';
  els.venueFieldHint.style.display = isSale ? 'none' : '';
  // The whole 案件マスタ (session master) paste-in workflow — venue/date
  // pulled per exhibition city/session — doesn't apply to online-sale
  // banners, which aren't created per session at all.
  els.sessionMasterFieldset.style.display = isSale ? 'none' : '';
  // subCopy keeps its normal label/role in both purposes — sale mode has
  // its own dedicated saleTag badge instead of repurposing subCopy as a CTA.
  els.subCopyFieldLabel.textContent = 'サブコピー（帯・2行目）';
  els.bannerPurposeHint.textContent = isSale
    ? 'ECサイト等に貼る購入導線用のバナーです。メインコピー・サブコピーはそのまま使えます。販売期間・価格は任意項目です（誤解を避けるため、金額は自動で入りません — 実際の額を確認できた時だけ入力してください）。'
    : '会場名・会期情報を軸に来場を促すバナーです。';

  // Sale mode only ever needs a single, optional deadline-style date (a
  // "start date" doesn't mean much for an ongoing online sale) — the start
  // date input is hidden entirely rather than just relabeled, so nobody
  // mistakes it for a required field.
  els.dateFieldLabel.textContent = isSale ? '販売終了日（任意）' : '会期情報（開始日・終了日）';
  els.dateFieldHint.textContent = isSale
    ? '日付・曜日の表示形式は選択中の言語に合わせて自動で変わります。オンライン販売用は「販売期間もあったりなかったり」なので任意項目です — 空欄なら何も表示されません。'
    : '日付・曜日の表示形式は選択中の言語に合わせて自動で変わります（例: 08.21 (Fri.) / 08.21（金））。案件マスタの会場を選ぶと自動反映されます（全言語共通）。';
  els.dateStartWrap.style.display = isSale ? 'none' : '';

  els.priceFieldLabel.style.display = isSale ? '' : 'none';
  els.priceField.style.display = isSale ? '' : 'none';
  els.priceFieldHint.style.display = isSale ? '' : 'none';
  els.saleTagFieldLabel.closest('.field-label-row').style.display = isSale ? '' : 'none';
  els.saleTag.style.display = isSale ? '' : 'none';
  els.saleTagHint.style.display = isSale ? '' : 'none';
}

// Builds the venue/date summary line shared by most templates. Each
// template joins these parts with whatever separator matches its own
// typography; this just decides WHAT goes in, not how it's drawn. Returns
// [{text, layer}] instead of plain strings — each part remembers which
// input field (and so which export layer) it came from, so the shared
// drawInfoLine() below can render venue/dates as one visual line while
// still landing each piece on its own layer.
//
// Price is NOT included here — in sale mode it gets its own pill via
// drawSaleBadges() below rather than folding into this muted text line,
// so it reads as prominently as it does on GAAAT's actual EC banners.
function buildInfoLineParts() {
  const dateOverrideText = els.dateOverride.value.trim();
  const dateEndLabel = formatBannerDate(els.dateEnd.value, state.currentLang);
  let dateRange;
  if (state.bannerPurpose === 'sale') {
    // Sale mode never shows a start date — an ongoing online sale usually
    // just has a (possibly absent) deadline, not a "始まる日".
    dateRange = dateOverrideText || formatSaleDeadline(dateEndLabel, state.currentLang);
  } else {
    const dateStartLabel = formatBannerDate(els.dateStart.value, state.currentLang);
    dateRange = dateOverrideText || [dateStartLabel, dateEndLabel].filter(Boolean).join(' – ');
  }
  const parts = [];
  if (state.bannerPurpose !== 'sale' && els.venue.value.trim()) parts.push({ text: els.venue.value.trim(), layer: 'venue' });
  if (dateRange) parts.push({ text: dateRange, layer: 'dates' });
  return parts;
}

// Draws `parts` ({text, layer}[]) as a single visual line joined by
// `separator`, but sends each part's pixels to its own named layer (the
// separator itself goes on 'decoration', since it isn't tied to any one
// field). `align` is 'left' | 'center' | 'right' relative to x. If `maxWidth`
// is given and the line would run wider, the font is shrunk (down to 70% of
// its requested size) until it fits — otherwise a long venue/date combo can
// run past a column edge or under adjacent artwork. Returns the total
// rendered width.
function drawInfoLine(parts, x, y, font, color, align, separator, alpha = 1, maxWidth = null) {
  if (!parts.length) return 0;
  ctx.font = font;
  let sepW = ctx.measureText(separator).width;
  let widths = parts.map(p => ctx.measureText(p.text).width);
  let totalW = widths.reduce((a, b) => a + b, 0) + sepW * (parts.length - 1);

  if (maxWidth && totalW > maxWidth) {
    const m = font.match(/^(\S+)\s+([\d.]+)px\s+(.*)$/);
    if (m) {
      const scale = Math.max(0.7, maxWidth / totalW);
      font = `${m[1]} ${Math.round(parseFloat(m[2]) * scale)}px ${m[3]}`;
      ctx.font = font;
      sepW = ctx.measureText(separator).width;
      widths = parts.map(p => ctx.measureText(p.text).width);
      totalW = widths.reduce((a, b) => a + b, 0) + sepW * (parts.length - 1);
    }
  }

  let cursorX;
  if (align === 'center') cursorX = x - totalW / 2;
  else if (align === 'right') cursorX = x - totalW;
  else cursorX = x;

  parts.forEach((p, i) => {
    useLayer(p.layer);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.globalAlpha = alpha;
    ctx.fillText(p.text, cursorX, y);
    ctx.globalAlpha = 1;
    cursorX += widths[i];
    if (i < parts.length - 1) {
      useLayer('decoration');
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.globalAlpha = alpha;
      ctx.fillText(separator, cursorX, y);
      ctx.globalAlpha = 1;
      cursorX += sepW;
    }
  });
  return totalW;
}

// Fallback CTA text for templates with a dedicated badge/pill/band — only
// kicks in when the user hasn't typed anything, so an online-sale banner
// still reads as one even before any copy is written.
function saleCtaFallback() {
  return state.bannerPurpose === 'sale' ? 'ONLINE STORE' : '';
}

// ---------- Sale badges (price pill + "アート作品 オンライン販売中" pill) ----------
// Modeled on GAAAT's actual EC banners (見本: R220/R256), which pair a
// colored "what this is" tag with a white price pill instead of burying
// either in a muted info line. saleTag is a dedicated free-text field —
// deliberately separate from subCopy, which keeps its one job (a secondary
// copy line) across both banner purposes instead of double-duty as a CTA.
// Both this and price are fully optional — neither auto-fills, so nothing
// shows unless someone actually typed it in.
function saleTagText() {
  return els.saleTag.value.trim();
}
function priceTagText() {
  return state.bannerPurpose === 'sale' ? els.priceField.value.trim() : '';
}

// Draws one rounded pill (filled background + single-line text) at `x,y`
// (y = top edge) and returns its box, so callers can stack several pills
// without measuring text twice. `opts.hidden` still computes and returns
// the box (so recordBounds/layout stay stable and the element remains
// grabbable in the adjustment panel) but skips the actual painting — same
// hide semantics as every other adjustable element (see logoAdj.hidden).
function drawPill(x, y, text, opts) {
  const { font, bg, fg, align = 'left', hidden = false } = opts;
  ctx.font = font;
  const sizeMatch = font.match(/(\d+(?:\.\d+)?)px/);
  const fontPx = sizeMatch ? parseFloat(sizeMatch[1]) : 20;
  const padX = opts.padX ?? fontPx * 0.7;
  const padY = opts.padY ?? fontPx * 0.42;
  const textW = ctx.measureText(text).width;
  const w = textW + padX * 2, h = fontPx + padY * 2;
  let left;
  if (align === 'center') left = x - w / 2;
  else if (align === 'right') left = x - w;
  else left = x;
  if (hidden) return { x: left, y, w, h };
  ctx.fillStyle = bg;
  roundRect(ctx, left, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + padX, y + h / 2 + fontPx * 0.03);
  ctx.textBaseline = 'alphabetic';
  return { x: left, y, w, h };
}

// Draws the sale-tag pill (accent bg, 'saleTag' category/layer) and price
// pill (white bg, 'venue' category/layer) stacked vertically, and returns
// the total height consumed (0 if both fields are empty). Kept on separate
// categories from 'dates' — the venue/date info line still renders
// independently in sale mode (a deadline-style end date is optional but
// showable), so it needs its own drag box and hide toggle, distinct from
// this pair. `anchorY` is the pair's bottom edge by default (anchor=
// 'bottom', stacks upward — for templates that lay out bottom-up); pass
// anchor='top' for templates building their layout top-down (anchorY is
// then the pair's top edge, tag pill first, price pill below it).
function drawSaleBadges(x, anchorY, align, accentHex, fgHex = '#ffffff', baseSize = 22, anchor = 'bottom') {
  if (state.bannerPurpose !== 'sale') return 0;
  const tagText = saleTagText();
  const priceText = priceTagText();
  if (!tagText && !priceText) return 0;

  const tagAdj = adj('saleTag');
  const venueAdj = adj('venue');

  if (anchor === 'top') {
    let cursorTop = anchorY;
    let bottom = anchorY;
    if (tagText) {
      useLayer('saleTag');
      const tagSize = baseSize * tagAdj.scale / 100;
      const pill = drawPill(x + tagAdj.dx, cursorTop + tagAdj.dy, tagText, {
        font: `700 ${tagSize}px ${FONT_STACK}`, bg: accentHex, fg: fgHex, align, hidden: tagAdj.hidden
      });
      recordBounds('saleTag', pill.x, pill.y, pill.w, pill.h);
      cursorTop = pill.y + pill.h + 10 - tagAdj.dy;
      bottom = pill.y + pill.h;
    }
    if (priceText) {
      useLayer('venue');
      const priceSize = baseSize * venueAdj.scale / 100;
      const pill = drawPill(x + venueAdj.dx, cursorTop + venueAdj.dy, priceText, {
        font: `700 ${priceSize}px ${FONT_STACK}`, bg: '#ffffff', fg: '#16171a', align, hidden: venueAdj.hidden
      });
      recordBounds('venue', pill.x, pill.y, pill.w, pill.h);
      bottom = pill.y + pill.h;
    }
    return bottom - anchorY;
  }

  let cursorBottom = anchorY;
  let top = anchorY;
  if (priceText) {
    useLayer('venue');
    const priceSize = baseSize * venueAdj.scale / 100;
    const pill = drawPill(x + venueAdj.dx, cursorBottom - (priceSize + priceSize * 0.42 * 2) + venueAdj.dy, priceText, {
      font: `700 ${priceSize}px ${FONT_STACK}`, bg: '#ffffff', fg: '#16171a', align, hidden: venueAdj.hidden
    });
    recordBounds('venue', pill.x, pill.y, pill.w, pill.h);
    cursorBottom = pill.y - 10 - venueAdj.dy;
    top = pill.y;
  }
  if (tagText) {
    useLayer('saleTag');
    const tagSize = baseSize * tagAdj.scale / 100;
    const pill = drawPill(x + tagAdj.dx, cursorBottom - (tagSize + tagSize * 0.42 * 2) + tagAdj.dy, tagText, {
      font: `700 ${tagSize}px ${FONT_STACK}`, bg: accentHex, fg: fgHex, align, hidden: tagAdj.hidden
    });
    recordBounds('saleTag', pill.x, pill.y, pill.w, pill.h);
    top = pill.y;
  }
  return anchorY - top;
}

// ---------- Drawing helpers ----------

function drawSpacedText(text, cx, y, opts) {
  const { font, spacing = 0, color = '#000', align = 'center' } = opts;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  const widths = [...text].map(ch => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let startX;
  if (align === 'center') startX = cx - total / 2;
  else if (align === 'left') startX = cx;
  else startX = cx - total;
  let x = startX;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += widths[i] + spacing;
  }
  return total;
}

// Measures text the same way drawSpacedText() actually draws it — summing
// each character's own width rather than measuring the string as one run.
// For letter-spaced titles those two numbers can differ a lot (condensed
// fonts especially), and fitFontSize/fitFontSizeTruncate must match
// whichever function will actually render the text, or their "fits within
// maxWidth" guarantee is measuring something other than what appears on
// screen. Falls back to a plain whole-string measurement when spacing is 0,
// since that's how every non-drawSpacedText caller here renders text.
function measureRunWidth(text, spacing) {
  if (!spacing) return ctx.measureText(text).width;
  let total = 0;
  for (const ch of text) total += ctx.measureText(ch).width;
  return total + spacing * Math.max(0, [...text].length - 1);
}

function fitFontSize(text, maxWidth, weight, family, startSize, minSize, spacing = 0) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (measureRunWidth(text, spacing) <= maxWidth) break;
    size -= 2;
  }
  return size;
}

// fitFontSize only ever shrinks down to minSize and stops — it never
// actually guarantees the text fits. That's fine for short Japanese labels,
// but a translated string can run 2-3x longer than its Japanese source, and
// a title/venue name that's still too wide even at minSize will silently
// overflow into whatever sits next to it (this was caught for real: an
// Italian venue name ran directly under the artwork, an Italian CTA pill
// text overlapped a duplicate label, and — after measureRunWidth above was
// added to fix a separate mismatch — an Italian vertical title still ran
// off the bottom of the canvas into the CTA band). This wraps fitFontSize
// and, if the text still doesn't fit at minSize, truncates with an ellipsis
// as a last resort so single-line fields never spill past their box.
// Returns {size, text} — use the returned text for measuring/drawing, not
// the original.
function fitFontSizeTruncate(text, maxWidth, weight, family, startSize, minSize, spacing = 0) {
  const size = fitFontSize(text, maxWidth, weight, family, startSize, minSize, spacing);
  ctx.font = `${weight} ${size}px ${family}`;
  let displayText = text;
  if (measureRunWidth(displayText, spacing) > maxWidth) {
    while (displayText.length > 1 && measureRunWidth(displayText + '…', spacing) > maxWidth) {
      displayText = displayText.slice(0, -1);
    }
    displayText = displayText.replace(/\s+$/, '') + '…';
  }
  return { size, text: displayText };
}

// Splits text into units (words, or characters for CJK) and greedily packs
// them into lines using measureRunWidth — spacing-aware, so it agrees with
// however the caller will actually draw the result (drawSpacedText for
// letter-spaced titles). ctx.font must already be set by the caller.
function wrapAtSize(text, maxWidth, spacing, byChar) {
  const units = byChar ? [...text] : text.split(/\s+/).filter(Boolean);
  if (!units.length) return [];
  const sep = byChar ? '' : ' ';
  const lines = [];
  let cur = units[0];
  for (let i = 1; i < units.length; i++) {
    const test = cur + sep + units[i];
    if (measureRunWidth(test, spacing) <= maxWidth) cur = test;
    else { lines.push(cur); cur = units[i]; }
  }
  lines.push(cur);
  return lines;
}

// Like fitFontSizeTruncate, but lets the text wrap across up to `maxLines`
// lines instead of shrinking indefinitely toward minSize on a single line.
// A long headline reads far more like a headline at a large size split
// across 2 lines than crushed onto 1 line near its floor — found by
// checking real project titles (e.g. a 32-character "GINTAMA ART EXHIBITION
// by GAAAT"-length string) landed within a few px of the single-line floor,
// making the title barely bigger than surrounding body copy. Picks the
// largest size (from startSize down to minSize) whose wrap fits within
// maxLines; if even minSize doesn't fit within maxLines, the last line is
// truncated with an ellipsis as a last resort so it never overflows.
// Returns {size, lines}.
//
// A literal "|" (half- or full-width — Japanese IME input often produces
// "｜") in the text is a user-chosen manual break point (e.g.
// "GAAAT銀魂｜藝術展"), typed directly into the タイトル field — the greedy
// auto-wrap below packs purely by width and can split a word/phrase
// somewhere that reads awkwardly (found from a real title where 「藝術展」
// split as 「藝」+「術展」), so an explicit "|"/"｜" always takes priority
// over automatic wrapping when present.
function fitFontSizeWrap(text, maxWidth, weight, family, startSize, minSize, spacing = 0, maxLines = 2, byChar = false) {
  if (text.includes('|') || text.includes('｜')) {
    const manualLines = text.split(/[|｜]/).map(s => s.trim()).filter(Boolean).slice(0, maxLines);
    let manualSize = startSize;
    while (manualSize > minSize) {
      ctx.font = `${weight} ${manualSize}px ${family}`;
      if (manualLines.every(ln => measureRunWidth(ln, spacing) <= maxWidth)) break;
      manualSize -= 2;
    }
    manualSize = Math.max(manualSize, minSize);
    ctx.font = `${weight} ${manualSize}px ${family}`;
    const finalLines = manualLines.map(ln => {
      if (measureRunWidth(ln, spacing) <= maxWidth) return ln;
      let t = ln;
      while (t.length > 1 && measureRunWidth(t + '…', spacing) > maxWidth) t = t.slice(0, -1);
      return t.replace(/\s+$/, '') + '…';
    });
    return { size: manualSize, lines: finalLines };
  }
  let size = startSize;
  let lines;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = wrapAtSize(text, maxWidth, spacing, byChar);
    if (lines.length <= maxLines) break;
    size -= 2;
  }
  size = Math.max(size, minSize);
  ctx.font = `${weight} ${size}px ${family}`;
  lines = wrapAtSize(text, maxWidth, spacing, byChar);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && measureRunWidth(last + '…', spacing) > maxWidth) {
      last = last.slice(0, -1);
    }
    kept[maxLines - 1] = last.replace(/\s+$/, '') + '…';
    lines = kept;
  }
  return { size, lines };
}

function wrapText(text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = cur + ' ' + words[i];
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else { lines.push(cur); cur = words[i]; }
  }
  lines.push(cur);
  return lines;
}

// zoom/panX/panY implement the 素材のトリミング・位置 (art crop/position)
// adjustment knob — zoom > 1 crops in tighter (shows less of the source,
// magnified); panX/panY are in *destination* px (same units as every other
// dx/dy adjustment) and shift which part of the source shows through the
// same output rect, positive = image content shifts right/down. Clamped so
// the crop window can never go outside the source image.
function computeCoverRect(img, w, h, zoom = 1, panX = 0, panY = 0) {
  const ir = img.naturalWidth / img.naturalHeight;
  const br = w / h;
  let sx, sy, sw, sh;
  if (ir > br) {
    sh = img.naturalHeight;
    sw = sh * br;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / br;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }
  if (zoom !== 1) {
    const z = Math.max(0.1, zoom);
    const nw = sw / z, nh = sh / z;
    sx += (sw - nw) / 2;
    sy += (sh - nh) / 2;
    sw = nw; sh = nh;
  }
  if (panX || panY) {
    sx -= panX * (sw / w);
    sy -= panY * (sh / h);
    sx = Math.min(Math.max(sx, 0), img.naturalWidth - sw);
    sy = Math.min(Math.max(sy, 0), img.naturalHeight - sh);
  }
  return { sx, sy, sw, sh };
}

function drawCoverImageTo(context, img, x, y, w, h, zoom = 1, panX = 0, panY = 0) {
  const { sx, sy, sw, sh } = computeCoverRect(img, w, h, zoom, panX, panY);
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  context.restore();
}

// Character-by-character wrapping — needed for CJK text in narrow columns,
// since Japanese/Chinese have no spaces for wrapText's word-boundary logic
// to break on.
function wrapTextChars(text, maxWidth, font) {
  ctx.font = font;
  const chars = [...text];
  if (chars.length === 0) return [];
  const lines = [];
  let cur = chars[0];
  for (let i = 1; i < chars.length; i++) {
    const test = cur + chars[i];
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else { lines.push(cur); cur = chars[i]; }
  }
  lines.push(cur);
  return lines;
}

function drawCoverImage(img, x, y, w, h, zoom = 1, panX = 0, panY = 0) {
  drawCoverImageTo(ctx, img, x, y, w, h, zoom, panX, panY);
}

// Renders the artwork into an offscreen canvas tinted a single flat color,
// using the image's own alpha as a mask (source-in). For a transparent PNG
// cutout this produces a true character silhouette; for an opaque photo/JPG
// it produces a flat tinted card — still useful as a soft backing shape.
function silhouetteCanvas(img, color, w, h) {
  const tmp = document.createElement('canvas');
  tmp.width = Math.max(1, Math.round(w));
  tmp.height = Math.max(1, Math.round(h));
  const tctx = tmp.getContext('2d');
  drawCoverImageTo(tctx, img, 0, 0, tmp.width, tmp.height);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, tmp.width, tmp.height);
  return tmp;
}

function tintedLogo(color, targetH) {
  if (!state.logoImage) return null;
  const ratio = state.logoImage.naturalWidth / state.logoImage.naturalHeight;
  const h = targetH, w = Math.round(h * ratio);
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(state.logoImage, 0, 0, w, h);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, w, h);
  return { canvas: tmp, w, h };
}

// ---------- Main render ----------

function render() {
  createLayers();
  state.elementBounds = {};
  TITLE_FONT_STACK = getTitleFontStack();
  if (state.template === 'frame3') renderFrameTemplate();
  else if (state.template === 'frame4') renderSpotlightFrameTemplate();
  else if (state.template === 'cutout1') renderCutoutTemplate();
  else if (state.template === 'vertical2') renderVerticalTitleTemplate();
  else if (state.template === 'cyberui5') renderCyberUiTemplate();
  else renderCurrentLayout();
  compositeLayers();
}

function renderCurrentLayout() {
  const W = CANVAS_SIZE;
  const MARGIN = 60;

  const bg = state.colors.bg;
  const accent = state.colors.accent;
  const textColorAuto = pickTextColor(bg);
  const textColor = state.textOverride || textColorAuto;
  const textHex = rgbToHex(textColor);
  const bandTextColor = pickTextColor(accent);
  const bandTextHex = rgbToHex(bandTextColor);

  ctx.clearRect(0, 0, W, W);
  ctx.fillStyle = rgbToHex(bg);
  ctx.fillRect(0, 0, W, W);

  useLayer('title');
  // ---- Title block ----
  const lines = els.title.value.split('\n').map(s => s.trim()).filter(Boolean);
  const titleMaxW = W - 2 * 110;
  let cursorY = 96;

  const artLeft = Math.round(W * 0.45);
  const colLeft = MARGIN;
  const colRight = artLeft - 40;

  const titleAdj = adj('title');
  if (lines[0]) {
    // Wraps to up to 2 lines rather than shrinking to a single crushed
    // line — a realistic long title (e.g. a 32-character title) used to
    // land within a few px of the old 40px floor, barely bigger than the
    // band's body copy. Splitting across 2 lines keeps it near its natural
    // large size instead. Plus a soft drop shadow so it reads as a poster
    // headline rather than flat body text, matching the more graphic
    // treatment the other templates already have.
    const isCjkTitle = ['ja', 'zh-Hans', 'zh-Hant'].includes(state.currentLang);
    const titleFit = fitFontSizeWrap(lines[0].toUpperCase(), titleMaxW, 700, TITLE_FONT_STACK, 136, state.titleNoWrap ? 14 : 64, 1, state.titleNoWrap ? 1 : 2, isCjkTitle);
    const size = titleFit.size * titleAdj.scale / 100;
    const titleLineH = size * 1.05;
    cursorY += size * 0.78;
    const titleStartY = cursorY;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    let titleBlockW = 0;
    titleFit.lines.forEach((ln, i) => {
      const baseline = titleStartY + i * titleLineH + titleAdj.dy;
      const w = drawSpacedText(ln, W / 2 + titleAdj.dx, baseline, {
        font: `700 ${size}px ${TITLE_FONT_STACK}`, spacing: 1, color: textHex, align: 'center'
      });
      titleBlockW = Math.max(titleBlockW, w);
    });
    ctx.restore();
    const titleBlockH = (titleFit.lines.length - 1) * titleLineH + size;
    recordBounds('title', W / 2 + titleAdj.dx - titleBlockW / 2, titleStartY + titleAdj.dy - size * 0.8, titleBlockW, titleBlockH);
    cursorY += titleBlockH - size + size * 0.30;
  }

  // The art panel starts right under the main headline (matching the
  // reference banner this layout is modeled on) rather than under the whole
  // title block — the subtitle/tagline instead run down the left column
  // beside the artwork, not full-width, so they no longer push it down.
  const artTop = Math.max(cursorY + 40, 220);

  if (lines[1]) {
    const size2 = 26;
    cursorY += 30;
    drawSpacedText(lines[1].toUpperCase(), colLeft, cursorY, {
      font: `600 ${size2}px ${FONT_STACK}`, spacing: 5, color: textHex, align: 'left'
    });
    cursorY += 16;
  }

  if (lines[2]) {
    const size3 = 28;
    const font3 = `500 ${size3}px ${FONT_STACK}`;
    const wrapped = wrapText(lines.slice(2).join(' '), colRight - colLeft, font3);
    cursorY += 38;
    ctx.font = font3;
    ctx.fillStyle = textHex;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    wrapped.forEach((ln, i) => {
      ctx.fillText(ln, colLeft, cursorY + i * 36);
    });
    cursorY += (wrapped.length - 1) * 36;
  }

  useLayer('decoration');
  // ---- Bottom band ----
  const bandH = 160;
  const bandTop = W - bandH;
  ctx.fillStyle = rgbToHex(accent);
  ctx.fillRect(0, bandTop, W, bandH);

  useLayer('artwork');
  // ---- Art panel ----
  const artBottom = bandTop;
  if (state.artImage) {
    const artAdj = adj('art');
    drawCoverImage(state.artImage, artLeft, artTop, W - artLeft, artBottom - artTop, artAdj.scale / 100, artAdj.dx, artAdj.dy);
    recordBounds('art', artLeft, artTop, W - artLeft, artBottom - artTop);
  } else {
    ctx.save();
    ctx.strokeStyle = textHex;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(artLeft + 4, artTop + 4, W - artLeft - 8, artBottom - artTop - 8);
    ctx.fillStyle = textHex;
    ctx.font = `400 20px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6;
    ctx.fillText('素材をアップロード', artLeft + (W - artLeft) / 2, artTop + (artBottom - artTop) / 2);
    ctx.restore();
  }

  // ---- Left info column ----
  const colW = colRight - colLeft;

  useLayer('decoration');
  // Logo (bottom anchored, just above band). logoBottomY — used below to
  // place venue/dates — is derived from a FIXED base height, not the
  // logo's own (possibly manually scaled) height, so resizing the logo
  // stays isolated to the logo itself instead of shifting where venue/
  // dates sit. Every other per-element adjustment already works this way
  // (its own box only); this just closes the one place logo's scale used
  // to leak into a different element's position.
  const logoAdj = adj('logo');
  const logoAnchorY = bandTop - 30;
  const logoBaseH = 40;
  const logoBottomY = logoAnchorY - logoBaseH;
  const tinted = tintedLogo(textHex, logoBaseH * logoAdj.scale / 100);
  if (tinted) {
    const logoY = logoAnchorY - tinted.h + logoAdj.dy;
    if (!logoAdj.hidden) ctx.drawImage(tinted.canvas, colLeft + logoAdj.dx, logoY, tinted.w, tinted.h);
    recordBounds('logo', colLeft + logoAdj.dx, logoY, tinted.w, tinted.h);
  }

  // Venue — not shown at all in sale mode (see applyBannerPurposeUI)
  useLayer('venue');
  const venueText = state.bannerPurpose === 'sale' ? '' : els.venue.value;
  const venueFit = fitFontSizeTruncate(venueText, colW, 700, FONT_STACK, 34, 22, 0.5);
  const venueBaseline = logoBottomY - 22;
  if (venueText) {
    ctx.font = `700 ${venueFit.size}px ${FONT_STACK}`;
    ctx.fillStyle = rgbToHex(accent);
    ctx.textAlign = 'left';
    ctx.fillText(venueFit.text, colLeft, venueBaseline);
  }

  if (state.bannerPurpose === 'sale') {
    // Online sale banners only ever need a single, optional deadline-style
    // date (no "start date"), sitting directly above the logo — venue never
    // draws in this mode, so the date takes over its slot rather than
    // floating in a gap left by the empty venue line above it.
    useLayer('dates');
    const datesAdj = adj('dates');
    const saleDateText = els.dateOverride.value.trim() || formatSaleDeadline(formatBannerDate(els.dateEnd.value, state.currentLang), state.currentLang);
    if (saleDateText) {
      // Fit at the BASE size first, then apply .scale as a plain
      // multiplier afterward (like title does) — feeding scale into the
      // fit search's startSize instead just gets shrunk straight back
      // down to whatever already fits, so dragging the resize handle
      // bigger has no visible effect past that point.
      const dateFit = fitFontSizeTruncate(saleDateText, colW, 800, FONT_STACK, 32, 20, 0);
      const dateSize = dateFit.size * datesAdj.scale / 100;
      ctx.font = `800 ${dateSize}px ${FONT_STACK}`;
      const dateBaseline = logoBottomY - 22 + datesAdj.dy;
      const dateW = ctx.measureText(dateFit.text).width;
      ctx.fillStyle = textHex;
      ctx.textAlign = 'left';
      ctx.fillText(dateFit.text, colLeft + datesAdj.dx, dateBaseline);
      recordBounds('dates', colLeft + datesAdj.dx, dateBaseline - dateSize * 0.8, dateW, dateSize);
    }
  } else {
  useLayer('dates');
  // Dates — formatted for the currently selected language/locale, or the
  // free-text override if the user typed one (for runs a start/end date
  // pair can't express, e.g. "会期中随時"). The override replaces the whole
  // two-line start/end display with a single line, so the slash connector —
  // meaningless once the text is arbitrary — is skipped in that case.
  const datesAdj = adj('dates');
  const dateOverrideText = els.dateOverride.value.trim();
  const dateStartLabel = formatBannerDate(els.dateStart.value, state.currentLang);
  const dateEndLabel = formatBannerDate(els.dateEnd.value, state.currentLang);
  const dateSize = 58 * datesAdj.scale / 100;
  const dateFont = `800 ${dateSize}px ${FONT_STACK}`;
  ctx.font = dateFont;

  if (dateOverrideText) {
    // Unlike the auto-formatted start/end labels (always a short "MM.DD
    // (Weekday)"), free-text override can be any length the user types —
    // found by testing a long one that ran straight off the canvas and
    // under the artwork with no shrink/truncate safety net at all.
    // Fit at the BASE size first, then apply .scale afterward — see the
    // sale-mode date branch above for why (feeding scale into the fit
    // search's startSize caps out silently once the natural fit is
    // smaller than the scaled request).
    const overrideFit = fitFontSizeTruncate(dateOverrideText, colW, 800, FONT_STACK, 58, 24, 0);
    const overrideSize = overrideFit.size * datesAdj.scale / 100;
    ctx.font = `800 ${overrideSize}px ${FONT_STACK}`;
    const overrideBaseline = venueBaseline - 52 + datesAdj.dy;
    const overrideW = ctx.measureText(overrideFit.text).width;
    ctx.fillStyle = textHex;
    ctx.textAlign = 'left';
    ctx.fillText(overrideFit.text, colLeft + datesAdj.dx, overrideBaseline);
    recordBounds('dates', colLeft + datesAdj.dx, overrideBaseline - overrideSize * 0.8, overrideW, overrideSize);
  } else {
    const startW = ctx.measureText(dateStartLabel).width;
    const endW = ctx.measureText(dateEndLabel).width;
    const dateBlockW = Math.max(startW, endW);
    const lineGap = 64 * datesAdj.scale / 100;
    const dateEndBaseline = venueBaseline - 52 + datesAdj.dy;
    const dateStartBaseline = dateEndBaseline - lineGap;

    ctx.fillStyle = textHex;
    ctx.textAlign = 'left';
    ctx.fillText(dateStartLabel, colLeft + datesAdj.dx, dateStartBaseline);
    ctx.fillText(dateEndLabel, colLeft + datesAdj.dx, dateEndBaseline);
    let datesTop = dateStartBaseline - dateSize * 0.8;

    // Slash connector, sitting right after the START date. Drawn as an
    // actual "/" text glyph (same font/baseline as dateStartLabel) rather
    // than a hand-drawn diagonal stroke — a hand-drawn line's height/angle
    // never quite matched the surrounding text's own cap-height and
    // baseline no matter how it was tuned, while a real glyph aligns
    // perfectly by definition. Positioned off `startW` (this line's own
    // width), not `dateBlockW`, so it hugs "(金)" itself even when the end
    // date happens to be the wider of the two lines.
    useLayer('decoration');
    if (dateStartLabel && dateEndLabel) {
      ctx.font = dateFont;
      ctx.fillStyle = textHex;
      ctx.textAlign = 'left';
      ctx.fillText('/', colLeft + datesAdj.dx + startW + 6, dateStartBaseline);
    }
    useLayer('dates');

    recordBounds('dates', colLeft + datesAdj.dx, datesTop, dateBlockW, dateEndBaseline - datesTop);
  }
  }

  // ---- Bottom band text ----
  const bandTextX = MARGIN;
  const bandCenterY = bandTop + bandH / 2;
  ctx.textAlign = 'left';

  const mainCopy = els.mainCopy.value;
  const subCopy = els.subCopy.value;
  const mainCopyAdj = adj('mainCopy');
  const subCopyAdj = adj('subCopy');
  let mainFont = `800 ${Math.round(42 * mainCopyAdj.scale / 100)}px ${FONT_STACK}`;
  const subFont = `400 ${Math.round(28 * subCopyAdj.scale / 100)}px ${FONT_STACK}`;

  const bandTextMaxW = W - bandTextX - MARGIN - 60;
  let mainLines;
  if (state.mainCopyNoWrap) {
    // Fit at the BASE size first, then apply .scale as a plain multiplier
    // afterward (like title does) rather than feeding it into the fit
    // search — otherwise dragging bigger just gets shrunk straight back
    // down to whatever already fits, and the drag has no visible effect.
    const fit = fitFontSizeTruncate(mainCopy, bandTextMaxW, 800, FONT_STACK, 42, 10, 0);
    mainFont = `800 ${fit.size * mainCopyAdj.scale / 100}px ${FONT_STACK}`;
    mainLines = [fit.text];
  } else {
    ctx.font = mainFont;
    mainLines = wrapText(mainCopy, bandTextMaxW, mainFont);
  }
  ctx.font = subFont;
  const subLines = subCopy ? wrapText(subCopy, bandTextMaxW, subFont) : [];

  const lineH1 = 48, lineH2 = 36, gapBetween = 8;
  const blockH = mainLines.length * lineH1 + (subLines.length ? gapBetween + subLines.length * lineH2 : 0);
  let ty = bandCenterY - blockH / 2 + lineH1 * 0.78;

  useLayer('mainCopy');
  ctx.fillStyle = bandTextHex;
  ctx.font = mainFont;
  const mainTop = ty - lineH1 * 0.78;
  const mainW = Math.max(1, ...mainLines.map(ln => ctx.measureText(ln).width));
  mainLines.forEach(ln => { ctx.fillText(ln, bandTextX + mainCopyAdj.dx, ty + mainCopyAdj.dy); ty += lineH1; });
  recordBounds('mainCopy', bandTextX + mainCopyAdj.dx, mainTop + mainCopyAdj.dy, mainW, mainLines.length * lineH1);
  if (subLines.length) {
    ty += gapBetween - lineH1 + lineH2 * 0.75;
    useLayer('subCopy');
    ctx.fillStyle = bandTextHex;
    ctx.font = subFont;
    const subTop = ty - lineH2 * 0.75;
    const subW = Math.max(1, ...subLines.map(ln => ctx.measureText(ln).width));
    subLines.forEach(ln => { ctx.fillText(ln, bandTextX + subCopyAdj.dx, ty + subCopyAdj.dy); ty += lineH2; });
    recordBounds('subCopy', bandTextX + subCopyAdj.dx, subTop + subCopyAdj.dy, subW, subLines.length * lineH2);
  }

  useLayer('copyright');
  // Copyright — small, bottom-right corner of the band, never over the artwork
  if (els.copyright.value.trim()) {
    const crAdj = adj('copyright');
    const crSize = Math.round(20 * crAdj.scale / 100);
    ctx.save();
    ctx.font = `500 ${crSize}px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = bandTextHex;
    ctx.globalAlpha = 0.7;
    const crX = W - MARGIN + crAdj.dx, crY = W - 24 + crAdj.dy;
    const crW = ctx.measureText(els.copyright.value).width;
    ctx.fillText(els.copyright.value, crX, crY);
    recordBounds('copyright', crX - crW, crY - crSize * 0.8, crW, crSize);
    ctx.restore();
  }

  // Sale-tag + price pills, bottom-right of the band, above copyright —
  // reads like a corner CTA button rather than competing with the
  // メインコピー/サブコピー copy on the band's left side. White pill
  // background (with accent-colored tag text) so it stays legible
  // regardless of how saturated the extracted accent color is.
  if (state.bannerPurpose === 'sale') {
    drawSaleBadges(W - MARGIN, W - 58, 'right', '#ffffff', rgbToHex(accent), 22);
  }

  useLayer('extraText');
  // Additional free-text item — no fixed role, just a small-print line the
  // user can type anything into (a hashtag, a notice, a special-case note).
  // Defaults to sitting just above copyright in the same corner, one line up
  // — fully repositionable like every other adjustable element.
  if (els.extraText.value.trim()) {
    const etAdj = adj('extraText');
    const etSize = Math.round(20 * etAdj.scale / 100);
    ctx.save();
    ctx.font = `500 ${etSize}px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = bandTextHex;
    ctx.globalAlpha = 0.7;
    const etX = W - MARGIN + etAdj.dx, etY = W - 24 - 26 + etAdj.dy;
    const etW = ctx.measureText(els.extraText.value).width;
    ctx.fillText(els.extraText.value, etX, etY);
    recordBounds('extraText', etX - etW, etY - etSize * 0.8, etW, etSize);
    ctx.restore();
  }
}

// ---------- Template 3: wall-mounted frame mockup ----------

function mixRgb(c, target, amt) {
  return {
    r: Math.round(c.r + (target.r - c.r) * amt),
    g: Math.round(c.g + (target.g - c.g) * amt),
    b: Math.round(c.b + (target.b - c.b) * amt)
  };
}
function lightenRgb(c, amt) { return mixRgb(c, { r: 255, g: 255, b: 255 }, amt); }
function darkenRgb(c, amt) { return mixRgb(c, { r: 0, g: 0, b: 0 }, amt); }

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// Draws the artwork plain — cover-fit directly into `outer` ({x,y,w,h}),
// no frame/mat/glass-reflection mockup. Shared by template③ (gallery
// wall) and template④ (spotlight). Previously wrapped the artwork in a
// framed-picture mockup (drop shadow, dark frame, accent fillet, mat,
// glass reflection, bevel), but a rendered frame implies a specific
// physical presentation — a particular frame color, matting, glazing —
// that may not match how the piece is actually exhibited or sold. Dropped
// per user feedback ("額装を勝手につけないでほしい"): showing artwork
// plainly can't misrepresent its real framing, for either banner purpose.
function drawArtworkPlain(outer) {
  useLayer('artwork');
  if (state.artImage) {
    const artAdj = adj('art');
    drawCoverImage(state.artImage, outer.x, outer.y, outer.w, outer.h, artAdj.scale / 100, artAdj.dx, artAdj.dy);
    recordBounds('art', outer.x, outer.y, outer.w, outer.h);
  } else {
    useLayer('decoration');
    ctx.save();
    ctx.strokeStyle = '#999';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(outer.x + 2, outer.y + 2, outer.w - 4, outer.h - 4);
    ctx.fillStyle = '#999';
    ctx.font = `400 18px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('素材をアップロード', outer.x + outer.w / 2, outer.y + outer.h / 2);
    ctx.restore();
  }
  return outer;
}

// Computes a picture-frame rect ({x,y,w,h}) centered in the vertical band
// [top, bottom] and horizontal band of width `availW`, using a slightly
// portrait aspect ratio like a real frame. Shared sizing logic for ③ and ④.
function computeFrameRect(top, bottom, availW) {
  const availH = bottom - top;
  const targetAspect = 0.84; // frame width / height
  let frameHeight = availH;
  let frameWidth = frameHeight * targetAspect;
  if (frameWidth > availW) {
    frameWidth = availW;
    frameHeight = frameWidth / targetAspect;
  }
  return {
    x: (CANVAS_SIZE - frameWidth) / 2,
    y: top + (availH - frameHeight) / 2,
    w: frameWidth,
    h: frameHeight
  };
}

// Gallery-style layout: artwork shown as a framed wall mockup (frame + mat +
// glass reflection), minimal decoration, neutral wall background. Meant as a
// general-purpose base that suits any IP, per template③ in docs/layout-templates.md.
function renderFrameTemplate() {
  const W = CANVAS_SIZE;
  const MARGIN = 72;

  const bg = state.colors.bg;
  const accent = state.colors.accent;
  const textColorAuto = pickTextColor(bg);
  const textColor = state.textOverride || textColorAuto;
  const textHex = rgbToHex(textColor);
  const bandTextColor = pickTextColor(accent);
  const bandTextHex = rgbToHex(bandTextColor);

  ctx.clearRect(0, 0, W, W);

  // Wall background — a very subtle vertical gradient for depth
  const wallGrad = ctx.createLinearGradient(0, 0, 0, W);
  wallGrad.addColorStop(0, rgbToHex(lightenRgb(bg, 0.04)));
  wallGrad.addColorStop(1, rgbToHex(darkenRgb(bg, 0.04)));
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, W, W);

  useLayer('decoration');
  // Small logo, top-left, subtle
  const logoAdj = adj('logo');
  const tinted = tintedLogo(textHex, 34 * logoAdj.scale / 100);
  if (tinted) {
    if (!logoAdj.hidden) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(tinted.canvas, MARGIN + logoAdj.dx, MARGIN - 6 + logoAdj.dy, tinted.w, tinted.h);
      ctx.restore();
    }
    recordBounds('logo', MARGIN + logoAdj.dx, MARGIN - 6 + logoAdj.dy, tinted.w, tinted.h);
  }

  useLayer('title');
  // ---- Headline (top center, wraps up to 2 lines rather than shrinking to
  // a single crushed line — see fitFontSizeWrap) ----
  const lines = els.title.value.split('\n').map(s => s.trim()).filter(Boolean);
  const headline = (lines[0] || '').toUpperCase();
  let headerBottom = MARGIN + 30;
  const titleAdj = adj('title');
  if (headline) {
    const isCjkTitle = ['ja', 'zh-Hans', 'zh-Hant'].includes(state.currentLang);
    const headlineFit = fitFontSizeWrap(headline, W - 2 * 140, 700, TITLE_FONT_STACK, 64, state.titleNoWrap ? 14 : 40, 1, state.titleNoWrap ? 1 : 2, isCjkTitle);
    const size = headlineFit.size * titleAdj.scale / 100;
    const lineH = size * 1.05;
    const yStart = MARGIN + 60;
    // Soft drop shadow so the headline reads with more visual weight
    // against the venue/date/CTA text below it, instead of a flat fill.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    let headlineW = 0;
    headlineFit.lines.forEach((ln, i) => {
      const baseline = yStart + i * lineH + titleAdj.dy;
      const w = drawSpacedText(ln, W / 2 + titleAdj.dx, baseline, { font: `700 ${size}px ${TITLE_FONT_STACK}`, spacing: 1, color: textHex, align: 'center' });
      headlineW = Math.max(headlineW, w);
    });
    ctx.restore();
    const blockH = (headlineFit.lines.length - 1) * lineH + size;
    recordBounds('title', W / 2 + titleAdj.dx - headlineW / 2, yStart + titleAdj.dy - size * 0.8, headlineW, blockH);
    headerBottom = yStart + (headlineFit.lines.length - 1) * lineH + 16;

    useLayer('decoration');
    const underlineW = 60;
    ctx.fillStyle = rgbToHex(accent);
    ctx.fillRect(W / 2 - underlineW / 2, headerBottom, underlineW, 3);
    headerBottom += 28;
  }

  // venue / date line, muted, centered
  const infoParts = buildInfoLineParts();
  if (infoParts.length) {
    const datesAdj = adj('dates');
    const infoSize = Math.round(24 * datesAdj.scale / 100);
    const infoX = W / 2 + datesAdj.dx, infoY = headerBottom + 24 + datesAdj.dy;
    const infoW = drawInfoLine(infoParts, infoX, infoY, `500 ${infoSize}px ${FONT_STACK}`, textHex, 'center', '   ／   ', 0.7, W - 2 * MARGIN);
    recordBounds('dates', infoX - infoW / 2, infoY - infoSize * 0.8, infoW, infoSize);
    headerBottom += 52;
  } else {
    headerBottom += 10;
  }

  // ---- Bottom text row reserved space ----
  const bottomBlockH = 132;
  const bottomBlockTop = W - MARGIN - bottomBlockH;

  // ---- Frame mockup, centered in the remaining space ----
  const frameTop = headerBottom + 34;
  const outer = computeFrameRect(frameTop, bottomBlockTop - 34, W - 2 * (MARGIN + 30));
  const art = drawArtworkPlain(outer);

  // ---- Bottom row: CTA pill, right-aligned ----
  // Used to also repeat the title as a "work name" label on the left, but a
  // long translated title (verbose languages routinely run 2-3x longer than
  // the Japanese source) could overflow its 42%-of-canvas budget even at the
  // smallest allowed size and collide with the CTA pill — actually observed
  // with an Italian title. The repeated title was redundant with the large
  // headline above anyway, so it's dropped rather than patched, and the CTA
  // pill now gets the full row width with its own guaranteed-fit sizing.
  const rowY = bottomBlockTop + bottomBlockH / 2;

  // Same subCopy/mainCopy CTA pill regardless of banner purpose — the
  // dedicated sale-tag/price pills (below, stacked above this one) are a
  // separate element, not a replacement, so subCopy keeps working here
  // exactly like it does in 集客 mode.
  const ctaSource = els.subCopy.value.trim() ? 'subCopy' : els.mainCopy.value.trim() ? 'mainCopy' : 'subCopy';
  const ctaText = (els.subCopy.value || els.mainCopy.value).trim();
  let ctaPillTop = rowY - 29;
  if (ctaText) {
    const ctaAdj = adj(ctaSource);
    const padX = 26, padY = 16;
    const ctaFit = fitFontSizeTruncate(ctaText, W - 2 * MARGIN - 2 * padX, 700, FONT_STACK, 26, 16, 0);
    const ctaSize = ctaFit.size * ctaAdj.scale / 100;
    ctx.font = `700 ${ctaSize}px ${FONT_STACK}`;
    const ctaW = ctx.measureText(ctaFit.text).width;
    const pillW = ctaW + padX * 2;
    const pillH = ctaSize + padY * 2;
    const pillX = W - MARGIN - pillW + ctaAdj.dx;
    const pillY = rowY - pillH / 2 + ctaAdj.dy;
    useLayer('decoration');
    ctx.fillStyle = rgbToHex(accent);
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    useLayer(ctaSource);
    ctx.fillStyle = bandTextHex;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaFit.text, pillX + padX, pillY + pillH / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    recordBounds(ctaSource, pillX, pillY, pillW, pillH);
    ctaPillTop = pillY;
  }

  // Sale-tag + price pills, bottom-right, stacked directly above the
  // subCopy/mainCopy CTA pill — reads as a small CTA-button cluster in the
  // corner rather than competing with the headline above.
  if (state.bannerPurpose === 'sale') {
    drawSaleBadges(W - MARGIN, ctaPillTop - 14, 'right', rgbToHex(accent), bandTextHex, 24);
  }

  useLayer('copyright');
  // Copyright, small, bottom-right corner
  if (els.copyright.value.trim()) {
    const crAdj = adj('copyright');
    ctx.save();
    const crSize = Math.round(18 * crAdj.scale / 100);
    ctx.font = `500 ${crSize}px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = textHex;
    ctx.globalAlpha = 0.6;
    const crX = W - MARGIN + crAdj.dx;
    const crY = W - 22 + crAdj.dy;
    ctx.fillText(els.copyright.value, crX, crY);
    const crW = ctx.measureText(els.copyright.value).width;
    ctx.restore();
    recordBounds('copyright', crX - crW, crY - crSize * 0.8, crW, crSize);
  }

  useLayer('extraText');
  // Additional free-text item — small print, defaults just above copyright.
  if (els.extraText.value.trim()) {
    const etAdj = adj('extraText');
    ctx.save();
    const etSize = Math.round(18 * etAdj.scale / 100);
    ctx.font = `500 ${etSize}px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = textHex;
    ctx.globalAlpha = 0.6;
    const etX = W - MARGIN + etAdj.dx;
    const etY = W - 22 - 24 + etAdj.dy;
    ctx.fillText(els.extraText.value, etX, etY);
    const etW = ctx.measureText(els.extraText.value).width;
    ctx.restore();
    recordBounds('extraText', etX - etW, etY - etSize * 0.8, etW, etSize);
  }
}

// ---------- Template 4: spotlight + framed mockup ----------
// Dramatic / heavy layout for hero, tokusatsu, or otherwise weighty IP. Same
// framed-artwork mockup as template③, but set against a dark background with
// a large colored spotlight, plus a bold outlined title. Also the reference
// layout for RTL (Arabic) banners — logo/copyright mirror to the left when
// state.currentLang === 'ar'.
function renderSpotlightFrameTemplate() {
  const W = CANVAS_SIZE;
  const MARGIN = 64;
  // Mirror logo/copyright to the left for Arabic. Canvas text shaping for
  // Arabic glyphs happens automatically regardless of ctx.direction — only
  // 'start'/'end' alignment and mixed-script bidi reordering need it, neither
  // of which this template uses (all text draws are physically left/right/
  // center-aligned and single-script), so we deliberately leave ctx.direction
  // untouched. Setting it to 'rtl' here previously reordered the ASCII
  // copyright text ("©HEADGEAR" → "HEADGEAR©") as a bidi side effect.
  const isRtl = state.currentLang === 'ar';

  const accent = state.colors.accent;
  const accentHex = rgbToHex(accent);
  const isCjkLang = ['ja', 'zh-Hans', 'zh-Hant'].includes(state.currentLang);
  const wrapFn = isCjkLang ? wrapTextChars : wrapText;

  ctx.clearRect(0, 0, W, W);

  // Dark base — this template always reads as dramatic/heavy regardless of
  // the extracted background color, so it deliberately overrides it.
  ctx.fillStyle = '#121214';
  ctx.fillRect(0, 0, W, W);

  // Large colored spotlight behind the frame — reads as a bold, near-solid
  // disc (matching real GAAAT spotlight banners) rather than a soft glow, so
  // it holds its own as a graphic element instead of just tinting the dark
  // background.
  const spot = ctx.createRadialGradient(W / 2, W * 0.46, 0, W / 2, W * 0.46, W * 0.42);
  spot.addColorStop(0, `rgba(${accent.r},${accent.g},${accent.b},0.92)`);
  spot.addColorStop(0.7, `rgba(${accent.r},${accent.g},${accent.b},0.75)`);
  spot.addColorStop(0.92, `rgba(${accent.r},${accent.g},${accent.b},0.25)`);
  spot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, W, W);

  useLayer('decoration');
  // Logo — top-right, mirrored to top-left for RTL
  const logoAdj = adj('logo');
  const tinted = tintedLogo('#ffffff', 36 * logoAdj.scale / 100);
  if (tinted) {
    const lx = (isRtl ? MARGIN : W - MARGIN - tinted.w) + logoAdj.dx;
    const ly = MARGIN - 4 + logoAdj.dy;
    if (!logoAdj.hidden) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(tinted.canvas, lx, ly, tinted.w, tinted.h);
      ctx.restore();
    }
    recordBounds('logo', lx, ly, tinted.w, tinted.h);
  }

  useLayer('title');
  // ---- Title: large, outlined + drop shadow, wraps up to 2 lines rather
  // than shrinking to a single crushed line (see fitFontSizeWrap) ----
  const lines = els.title.value.split('\n').map(s => s.trim()).filter(Boolean);
  const titleText = (lines[0] || '').toUpperCase();
  let cursorY = MARGIN + 40;
  const titleAdj = adj('title');
  if (titleText) {
    const isCjkTitle = ['ja', 'zh-Hans', 'zh-Hant'].includes(state.currentLang);
    const titleFit = fitFontSizeWrap(titleText, W - 2 * 120, 700, TITLE_FONT_STACK, 116, state.titleNoWrap ? 14 : 56, 1, state.titleNoWrap ? 1 : 2, isCjkTitle);
    const size = titleFit.size * titleAdj.scale / 100;
    const lineH = size * 1.05;
    const yStart = cursorY + size * 0.78;
    ctx.font = `700 ${size}px ${TITLE_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size * 0.06);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    let titleW = 0;
    titleFit.lines.forEach((ln, i) => {
      const baseline = yStart + i * lineH + titleAdj.dy;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 6;
      ctx.strokeText(ln, W / 2 + titleAdj.dx, baseline);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.fillText(ln, W / 2 + titleAdj.dx, baseline);
      titleW = Math.max(titleW, ctx.measureText(ln).width);
    });
    const blockH = (titleFit.lines.length - 1) * lineH + size;
    recordBounds('title', W / 2 + titleAdj.dx - titleW / 2, yStart + titleAdj.dy - size * 0.8, titleW, blockH);
    cursorY = yStart + (titleFit.lines.length - 1) * lineH + size * 0.3;
  }

  useLayer('mainCopy');
  // ---- Subcopy: white, up to 2 lines ----
  const subCopyText = els.mainCopy.value;
  if (subCopyText) {
    const mainCopyAdj = adj('mainCopy');
    let font = `500 ${Math.round(30 * mainCopyAdj.scale / 100)}px ${FONT_STACK}`;
    let subLines;
    if (state.mainCopyNoWrap) {
      const fit = fitFontSizeTruncate(subCopyText, W - 2 * 150, 500, FONT_STACK, 30, 10, 0);
      font = `500 ${fit.size * mainCopyAdj.scale / 100}px ${FONT_STACK}`;
      subLines = [fit.text];
    } else {
      subLines = wrapFn(subCopyText, W - 2 * 150, font).slice(0, 2);
    }
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.92;
    cursorY += 36;
    subLines.forEach((ln, i) => ctx.fillText(ln, W / 2 + mainCopyAdj.dx, cursorY + i * 38 + mainCopyAdj.dy));
    ctx.globalAlpha = 1;
    const mainSize = 30 * mainCopyAdj.scale / 100;
    const mainW = Math.max(1, ...subLines.map(ln => ctx.measureText(ln).width));
    recordBounds('mainCopy', W / 2 + mainCopyAdj.dx - mainW / 2, cursorY + mainCopyAdj.dy - mainSize * 0.8, mainW, (subLines.length - 1) * 38 + mainSize);
    cursorY += (subLines.length - 1) * 38 + 30;
  }

  // ---- Bottom block: CTA (colored) + venue/date + copyright ----
  const bottomBlockH = 165;
  const bottomBlockTop = W - MARGIN - bottomBlockH;

  // ---- Frame mockup, centered in the remaining space ----
  const outer = computeFrameRect(cursorY + 20, bottomBlockTop - 20, W - 2 * (MARGIN + 40));
  drawArtworkPlain(outer);

  const rowY = bottomBlockTop + 30;
  // Same subCopy CTA text regardless of banner purpose — the dedicated
  // sale-tag/price pills (below) are a separate element, not a
  // replacement, so subCopy keeps working here exactly like it does in
  // 集客 mode.
  useLayer('subCopy');
  const ctaText = els.subCopy.value.trim();
  if (ctaText) {
    const subCopyAdj = adj('subCopy');
    const ctaFit = fitFontSizeTruncate(ctaText, W - 2 * MARGIN, 800, FONT_STACK, 40, 24, 0);
    ctx.font = `800 ${ctaFit.size * subCopyAdj.scale / 100}px ${FONT_STACK}`;
    ctx.fillStyle = accentHex;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(ctaFit.text, W / 2 + subCopyAdj.dx, rowY + subCopyAdj.dy);
    ctx.shadowBlur = 0;
    const ctaSize = ctaFit.size * subCopyAdj.scale / 100;
    const ctaW = ctx.measureText(ctaFit.text).width;
    recordBounds('subCopy', W / 2 + subCopyAdj.dx - ctaW / 2, rowY + subCopyAdj.dy - ctaSize * 0.8, ctaW, ctaSize);
  }

  const infoParts = buildInfoLineParts();
  if (infoParts.length) {
    const datesAdj = adj('dates');
    const infoSize = Math.round(22 * datesAdj.scale / 100);
    const infoX = W / 2 + datesAdj.dx, infoY = rowY + 38 + datesAdj.dy;
    const infoW = drawInfoLine(infoParts, infoX, infoY, `500 ${infoSize}px ${FONT_STACK}`, '#fff', 'center', '   ／   ', 0.85, W - 2 * MARGIN);
    recordBounds('dates', infoX - infoW / 2, infoY - infoSize * 0.8, infoW, infoSize);
  }

  // Sale-tag + price pills, bottom corner (mirrored for RTL), above
  // copyright — reads as a small CTA-button cluster in the corner.
  if (state.bannerPurpose === 'sale') {
    const badgeX = isRtl ? MARGIN : W - MARGIN;
    drawSaleBadges(badgeX, W - MARGIN - 30, isRtl ? 'left' : 'right', accentHex, '#fff', 24);
  }

  useLayer('copyright');
  // Copyright — bottom-right, mirrored to bottom-left for RTL
  if (els.copyright.value.trim()) {
    const crAdj = adj('copyright');
    const crSize = Math.round(18 * crAdj.scale / 100);
    ctx.font = `500 ${crSize}px ${FONT_STACK}`;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.6;
    ctx.textAlign = isRtl ? 'left' : 'right';
    const crX = (isRtl ? MARGIN : W - MARGIN) + crAdj.dx;
    const crY = W - 24 + crAdj.dy;
    ctx.fillText(els.copyright.value, crX, crY);
    const crW = ctx.measureText(els.copyright.value).width;
    ctx.globalAlpha = 1;
    recordBounds('copyright', isRtl ? crX : crX - crW, crY - crSize * 0.8, crW, crSize);
  }

  useLayer('extraText');
  // Additional free-text item — small print, defaults just above copyright
  // (same RTL mirroring).
  if (els.extraText.value.trim()) {
    const etAdj = adj('extraText');
    const etSize = Math.round(18 * etAdj.scale / 100);
    ctx.font = `500 ${etSize}px ${FONT_STACK}`;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.6;
    ctx.textAlign = isRtl ? 'left' : 'right';
    const etX = (isRtl ? MARGIN : W - MARGIN) + etAdj.dx;
    const etY = W - 24 - 26 + etAdj.dy;
    ctx.fillText(els.extraText.value, etX, etY);
    const etW = ctx.measureText(els.extraText.value).width;
    ctx.globalAlpha = 1;
    recordBounds('extraText', isRtl ? etX : etX - etW, etY - etSize * 0.8, etW, etSize);
  }
}

// ---------- Template 1: character cutout, diagonal placement ----------
// Pop / energetic layout for shonen-manga / sports type IP. A large gradient
// title top-left, a diagonally placed character panel bottom-right (bleeding
// off the edges), a soft tinted silhouette behind it for a sense of motion,
// and a catchphrase over a vertical accent bar bottom-left.
function renderCutoutTemplate() {
  const W = CANVAS_SIZE;
  const MARGIN = 64;

  const bg = state.colors.bg;
  const accent = state.colors.accent;
  const textColorAuto = pickTextColor(bg);
  const textColor = state.textOverride || textColorAuto;
  const textHex = rgbToHex(textColor);
  const accentHex = rgbToHex(accent);

  ctx.clearRect(0, 0, W, W);
  ctx.fillStyle = rgbToHex(bg);
  ctx.fillRect(0, 0, W, W);

  useLayer('decoration');
  // Left accent bar
  const barW = 14;
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, barW, W);

  const textLeft = barW + MARGIN - 14;

  useLayer('artwork');
  // ---- Character art: diagonal panel, bottom-right, bleeding off the edges ----
  const artCx = W * 0.72;
  const artCy = W * 0.62;
  const artW = W * 0.78;
  const artH = W * 0.86;
  const angle = -4 * Math.PI / 180;
  // Left edge of the (unrotated) art panel — used to keep every text block
  // in the left column from running under the character art, whatever its
  // font size ends up being.
  const artLeftEdge = artCx - artW / 2;
  const textColMaxW = Math.max(200, artLeftEdge - textLeft - 30);

  if (state.artImage) {
    const artAdj = adj('art');
    // Soft duplicate silhouette behind the art, offset + larger, for motion
    const silh = silhouetteCanvas(state.artImage, accentHex, artW, artH);
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.translate(artCx + 34 + artAdj.dx, artCy + 26 + artAdj.dy);
    ctx.rotate(angle - 5 * Math.PI / 180);
    ctx.scale(1.06, 1.06);
    ctx.drawImage(silh, -artW / 2, -artH / 2);
    ctx.restore();

    // Main art panel, with a soft drop shadow so it reads as "floating"
    ctx.save();
    ctx.translate(artCx + artAdj.dx, artCy + artAdj.dy);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 14;
    drawCoverImageTo(ctx, state.artImage, -artW / 2, -artH / 2, artW, artH, artAdj.scale / 100);
    ctx.restore();
    recordBounds('art', artCx + artAdj.dx - artW / 2, artCy + artAdj.dy - artH / 2, artW, artH);
  } else {
    ctx.save();
    ctx.translate(artCx, artCy);
    ctx.rotate(angle);
    ctx.strokeStyle = textHex;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(-artW / 2, -artH / 2, artW, artH);
    ctx.fillStyle = textHex;
    ctx.font = `400 20px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6;
    ctx.fillText('素材をアップロード', 0, 0);
    ctx.restore();
  }

  useLayer('title');
  // ---- Title block, top-left, gradient fill ----
  const lines = els.title.value.split('\n').map(s => s.trim()).filter(Boolean);
  const titleMaxW = W * 0.56;
  let cursorY = MARGIN + 70;

  const titleAdj = adj('title');
  if (lines[0]) {
    const headline = lines[0].toUpperCase();
    // Bounded by the art panel's left edge (titleMaxW = W*0.56) like the
    // catchphrase below. Wraps to up to 2 lines rather than shrinking to a
    // single crushed line (see fitFontSizeWrap) — still truncates as a last
    // resort if even 2 lines at the floor size don't fit, since a long
    // translated title could otherwise still run straight into the artwork
    // (observed for real with an Italian title elsewhere in this file).
    // Note titleAdj.scale is applied *after* this fit, so cranking it well
    // above 100% can reintroduce that same overflow — an accepted trade-off
    // for a manually-dialed-in, visually-checked override, unlike the
    // automatic per-language sizing.
    const isCjkTitle = ['ja', 'zh-Hans', 'zh-Hant'].includes(state.currentLang);
    const headlineFit = fitFontSizeWrap(headline, titleMaxW, 700, TITLE_FONT_STACK, 108, state.titleNoWrap ? 14 : 48, 1, state.titleNoWrap ? 1 : 2, isCjkTitle);
    const size = headlineFit.size * titleAdj.scale / 100;
    const lineH = size * 1.05;
    ctx.font = `700 ${size}px ${TITLE_FONT_STACK}`;
    const grad = ctx.createLinearGradient(textLeft, 0, textLeft + titleMaxW, 0);
    grad.addColorStop(0, accentHex);
    grad.addColorStop(1, rgbToHex(lightenRgb(accent, 0.35)));
    ctx.textAlign = 'left';
    // Real GAAAT cutout-style banners consistently give this kind of bold
    // title a dark outline + drop shadow — it reads as "poster lettering"
    // and keeps it legible if it ever overlaps busy artwork, instead of
    // just a flat gradient fill sitting on the background.
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.05);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    let headlineW = 0;
    const titleStartY = cursorY;
    headlineFit.lines.forEach((ln, i) => {
      const baseline = titleStartY + i * lineH + titleAdj.dy;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.strokeText(ln, textLeft + titleAdj.dx, baseline);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = grad;
      ctx.fillText(ln, textLeft + titleAdj.dx, baseline);
      headlineW = Math.max(headlineW, ctx.measureText(ln).width);
    });
    const blockH = (headlineFit.lines.length - 1) * lineH + size;
    recordBounds('title', textLeft + titleAdj.dx, titleStartY + titleAdj.dy - size * 0.8, headlineW, blockH);
    cursorY += (headlineFit.lines.length - 1) * lineH + size * 0.42;
  }

  if (lines[1]) {
    cursorY += 32;
    drawSpacedText(lines[1].toUpperCase(), textLeft, cursorY, {
      font: `600 22px ${FONT_STACK}`, spacing: 3, color: textHex, align: 'left'
    });
    cursorY += 8;
  }

  // Session subtitle: formal name (from title field, if any) on its own
  // line, then venue/date(/price) on the next — each on its own layer.
  const formalName = lines.slice(2).join(' ');
  if (formalName) {
    cursorY += 28;
    useLayer('title');
    const formalFont = `400 20px ${FONT_STACK}`;
    const formalLines = wrapText(formalName, textColMaxW, formalFont).slice(0, 2);
    ctx.font = formalFont;
    ctx.fillStyle = textHex;
    ctx.textAlign = 'left';
    ctx.globalAlpha = 0.75;
    formalLines.forEach((ln, i) => ctx.fillText(ln, textLeft, cursorY + i * 26));
    ctx.globalAlpha = 1;
    cursorY += (formalLines.length - 1) * 26;
  }
  const sessionParts = buildInfoLineParts();
  if (sessionParts.length) {
    cursorY += 30;
    const datesAdj = adj('dates');
    const infoSize = Math.round(20 * datesAdj.scale / 100);
    const infoX = textLeft + datesAdj.dx, infoY = cursorY + datesAdj.dy;
    const infoW = drawInfoLine(sessionParts, infoX, infoY, `400 ${infoSize}px ${FONT_STACK}`, textHex, 'left', '　', 0.75, textColMaxW);
    recordBounds('dates', infoX, infoY - infoSize * 0.8, infoW, infoSize);
  }
  // ---- Catchphrase, bottom-left ----
  // Bounded by the art panel's left edge so it never runs under the character.
  const mainCopy = els.mainCopy.value;
  const subCopy = els.subCopy.value;
  const copyMaxW = textColMaxW;
  const mainCopyAdj = adj('mainCopy');
  const subCopyAdj = adj('subCopy');
  let mainFont = `800 ${Math.round(38 * mainCopyAdj.scale / 100)}px ${FONT_STACK}`;
  const subFont = `400 ${Math.round(24 * subCopyAdj.scale / 100)}px ${FONT_STACK}`;
  const isCjkLang = ['ja', 'zh-Hans', 'zh-Hant'].includes(state.currentLang);
  const wrapFn = isCjkLang ? wrapTextChars : wrapText;

  let mainLines;
  if (state.mainCopyNoWrap) {
    const fit = fitFontSizeTruncate(mainCopy, copyMaxW, 800, FONT_STACK, 38, 10, 0);
    mainFont = `800 ${fit.size * mainCopyAdj.scale / 100}px ${FONT_STACK}`;
    mainLines = [fit.text];
  } else {
    ctx.font = mainFont;
    mainLines = wrapFn(mainCopy, copyMaxW, mainFont);
  }
  ctx.font = subFont;
  const subLines = subCopy ? wrapFn(subCopy, copyMaxW, subFont) : [];

  const lineH1 = 46, lineH2 = 32, gapBetween = 10;
  const blockH = mainLines.length * lineH1 + (subLines.length ? gapBetween + subLines.length * lineH2 : 0);
  let ty = W - MARGIN - 30 - blockH + lineH1 * 0.78;

  useLayer('mainCopy');
  ctx.textAlign = 'left';
  ctx.fillStyle = textHex;
  ctx.font = mainFont;
  const mainStartTy = ty;
  mainLines.forEach(ln => { ctx.fillText(ln, textLeft + mainCopyAdj.dx, ty + mainCopyAdj.dy); ty += lineH1; });
  if (mainLines.length) {
    const mainSize = 38 * mainCopyAdj.scale / 100;
    const mainW = Math.max(1, ...mainLines.map(ln => ctx.measureText(ln).width));
    recordBounds('mainCopy', textLeft + mainCopyAdj.dx, mainStartTy + mainCopyAdj.dy - mainSize * 0.8, mainW, mainLines.length * lineH1);
  }
  if (subLines.length) {
    ty += gapBetween - lineH1 + lineH2 * 0.75;
    useLayer('subCopy');
    ctx.textAlign = 'left';
    ctx.fillStyle = textHex;
    ctx.font = subFont;
    ctx.globalAlpha = 0.75;
    const subStartTy = ty;
    subLines.forEach(ln => { ctx.fillText(ln, textLeft + subCopyAdj.dx, ty + subCopyAdj.dy); ty += lineH2; });
    ctx.globalAlpha = 1;
    const subSize = 24 * subCopyAdj.scale / 100;
    const subW = Math.max(1, ...subLines.map(ln => ctx.measureText(ln).width));
    recordBounds('subCopy', textLeft + subCopyAdj.dx, subStartTy + subCopyAdj.dy - subSize * 0.8, subW, subLines.length * lineH2);
  }

  // Sale-tag + price pills, bottom-right, stacked above the logo/copyright
  // cluster below — the pills carry their own solid background, so unlike
  // plain text they don't need the corner scrim for contrast.
  if (state.bannerPurpose === 'sale') {
    drawSaleBadges(W - MARGIN, W - 170, 'right', accentHex, rgbToHex(pickTextColor(accent)), 20);
  }

  // ---- Logo + copyright, fixed bottom-right ----
  // This corner sits on top of the character art, so contrast against the
  // extracted palette isn't reliable — scrim it and use fixed white instead.
  useLayer('decoration');
  if (state.artImage) {
    ctx.save();
    const scrim = ctx.createRadialGradient(W, W, 0, W, W, 260);
    scrim.addColorStop(0, 'rgba(0,0,0,0.5)');
    scrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(W - 300, W - 300, 300, 300);
    ctx.restore();
  }
  const cornerTextColor = state.artImage ? '#ffffff' : textHex;
  const logoAdj = adj('logo');
  const tinted = tintedLogo(cornerTextColor, 30 * logoAdj.scale / 100);
  if (tinted) {
    const lx = W - MARGIN - tinted.w + logoAdj.dx;
    const ly = W - MARGIN - tinted.h - 22 + logoAdj.dy;
    if (!logoAdj.hidden) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(tinted.canvas, lx, ly, tinted.w, tinted.h);
      ctx.restore();
    }
    recordBounds('logo', lx, ly, tinted.w, tinted.h);
  }
  useLayer('copyright');
  if (els.copyright.value.trim()) {
    const crAdj = adj('copyright');
    const crSize = Math.round(18 * crAdj.scale / 100);
    ctx.font = `500 ${crSize}px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = cornerTextColor;
    ctx.globalAlpha = 0.8;
    const crX = W - MARGIN + crAdj.dx;
    const crY = W - MARGIN + 4 + crAdj.dy;
    ctx.fillText(els.copyright.value, crX, crY);
    const crW = ctx.measureText(els.copyright.value).width;
    ctx.globalAlpha = 1;
    recordBounds('copyright', crX - crW, crY - crSize * 0.8, crW, crSize);
  }

  useLayer('extraText');
  // Additional free-text item — small print, defaults just above copyright.
  if (els.extraText.value.trim()) {
    const etAdj = adj('extraText');
    const etSize = Math.round(18 * etAdj.scale / 100);
    ctx.font = `500 ${etSize}px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = cornerTextColor;
    ctx.globalAlpha = 0.8;
    const etX = W - MARGIN + etAdj.dx;
    const etY = W - MARGIN + 4 - 26 + etAdj.dy;
    ctx.fillText(els.extraText.value, etX, etY);
    const etW = ctx.measureText(els.extraText.value).width;
    ctx.globalAlpha = 1;
    recordBounds('extraText', etX - etW, etY - etSize * 0.8, etW, etSize);
  }
}

// ---------- Template 2: full-bleed art, vertical (tategaki) title ----------
// Retro / dramatic layout for Japanese-style or classic IP. Artwork fills the
// canvas with a legibility scrim; the title runs vertically down the right
// edge (character-stacked for CJK, rotated for Latin scripts), dates run
// vertically on the left, and a ribbon band along the bottom carries the CTA.
function renderVerticalTitleTemplate() {
  const W = CANVAS_SIZE;
  const MARGIN = 56;

  const accent = state.colors.accent;
  const accentHex = rgbToHex(accent);
  const white = '#ffffff';

  ctx.clearRect(0, 0, W, W);

  // Solid base fill on the always-visible 'background' layer — this template
  // is normally full-bleed art with nothing behind it, so hiding 素材 via
  // the adjustment panel's 非表示 checkbox would otherwise leave a fully
  // transparent hole instead of falling back to a solid color like every
  // other adjustable element does when hidden.
  useLayer('background');
  ctx.fillStyle = rgbToHex(state.colors.bg);
  ctx.fillRect(0, 0, W, W);

  useLayer('artwork');
  if (state.artImage) {
    const artAdj = adj('art');
    drawCoverImage(state.artImage, 0, 0, W, W, artAdj.scale / 100, artAdj.dx, artAdj.dy);
    recordBounds('art', 0, 0, W, W);
  } else {
    ctx.save();
    ctx.strokeStyle = '#999';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(MARGIN, MARGIN, W - 2 * MARGIN, W - 2 * MARGIN);
    ctx.fillStyle = '#999';
    ctx.font = `400 20px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('素材をアップロード', W / 2, W / 2);
    ctx.restore();
  }

  useLayer('decoration');
  // Legibility scrims: right edge (title), left edge (date), bottom (venue/band)
  const rightScrim = ctx.createLinearGradient(W * 0.5, 0, W, 0);
  rightScrim.addColorStop(0, 'rgba(0,0,0,0)');
  rightScrim.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = rightScrim;
  ctx.fillRect(W * 0.5, 0, W * 0.5, W);

  const leftScrim = ctx.createLinearGradient(0, 0, W * 0.22, 0);
  leftScrim.addColorStop(0, 'rgba(0,0,0,0.5)');
  leftScrim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = leftScrim;
  ctx.fillRect(0, 0, W * 0.22, W);

  const topScrim = ctx.createLinearGradient(0, 0, 0, W * 0.2);
  topScrim.addColorStop(0, 'rgba(0,0,0,0.4)');
  topScrim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, W, W * 0.2);

  useLayer('title');
  // ---- Vertical title, right side ----
  const lines = els.title.value.split('\n').map(s => s.trim()).filter(Boolean);
  const titleText = lines[0] || '';
  const isCjk = ['ja', 'zh-Hans', 'zh-Hant'].includes(state.currentLang);
  const titleX = W - MARGIN - 30;

  const titleAdj = adj('title');
  if (titleText) {
    if (isCjk) {
      const maxH = W - 2 * MARGIN - 140;
      const colGap = 10;
      const lineStep = 1.06;
      const maxCols = 2;
      // Every character advances the SAME fixed vertical step (fontSize ×
      // lineStep) regardless of its actual glyph width, so column-packing
      // has to be done by character COUNT, not measured width — reusing
      // fitFontSizeWrap's width-based packer here (as an earlier version of
      // this did) badly overflows for narrow (non-CJK) characters, since
      // far more of them fit within a measured-width budget than actually
      // fit within the fixed-step height budget. Found by testing an
      // English title while the language was set to Japanese (so it took
      // this isCjk branch): height ran to ~1819px, well past the 1080px
      // canvas. Shrinks toward the floor until the text fits within
      // maxCols columns of maxH each, then truncates with an ellipsis on
      // the last column as a last resort if even the floor doesn't fit.
      const colCapacity = (size) => Math.max(1, Math.floor(maxH / (size * lineStep)));
      let fontSize = 78;
      let cols;
      if (titleText.includes('|') || titleText.includes('｜')) {
        // Manual break — same "|"/"｜" convention as fitFontSizeWrap (see its
        // comment), reimplemented here against character-count capacity
        // instead of measured width, matching the char-count packing this
        // branch already uses for the same reason (see comment above).
        cols = titleText.split(/[|｜]/).map(s => s.trim()).filter(Boolean).slice(0, maxCols).map(s => [...s]);
        while (fontSize > 40 && cols.some(col => col.length > colCapacity(fontSize))) fontSize -= 4;
        const cap = colCapacity(fontSize);
        cols = cols.map(col => col.length <= cap ? col : col.slice(0, Math.max(1, cap - 1)).concat('…'));
      } else {
        while (fontSize > 40 && Math.ceil(titleText.length / colCapacity(fontSize)) > maxCols) fontSize -= 4;
        const perCol = colCapacity(fontSize);
        let displayChars = [...titleText];
        if (displayChars.length > perCol * maxCols) {
          displayChars = displayChars.slice(0, perCol * maxCols - 1).concat('…');
        }
        cols = [];
        for (let i = 0; i < displayChars.length; i += perCol) cols.push(displayChars.slice(i, i + perCol));
      }

      fontSize = fontSize * titleAdj.scale / 100;
      const stepPx = fontSize * lineStep;
      ctx.font = `700 ${fontSize}px ${TITLE_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = white;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 16;
      const titleStartY = MARGIN + 70 + titleAdj.dy;
      let maxColLen = 0;
      cols.forEach((col, colIdx) => {
        const colX = titleX + titleAdj.dx - colIdx * (fontSize + colGap);
        let y = titleStartY;
        for (const ch of col) {
          ctx.fillText(ch, colX, y);
          y += stepPx;
        }
        maxColLen = Math.max(maxColLen, col.length);
      });
      ctx.shadowBlur = 0;
      const numCols = cols.length;
      const totalW = numCols * fontSize + (numCols - 1) * colGap;
      const totalH = maxColLen * stepPx;
      recordBounds('title', titleX + titleAdj.dx - (numCols - 1) * (fontSize + colGap) - fontSize / 2, titleStartY - fontSize * 0.8, totalW, totalH);
    } else {
      // This axis becomes vertical after the rotate() below, running down
      // toward the bottom ribbon band. Wraps across up to 2 parallel
      // rotated columns (second column shifted further left in screen-x)
      // rather than shrinking to a single crushed line, so a long
      // translated title still reads at a reasonably large size instead of
      // running into the band underneath it.
      const titleFit = fitFontSizeWrap(titleText.toUpperCase(), W - 2 * MARGIN - 140, 700, TITLE_FONT_STACK, 84, state.titleNoWrap ? 14 : 40, 2, state.titleNoWrap ? 1 : 2, false);
      const size = titleFit.size * titleAdj.scale / 100;
      const colGap = 14;
      const originX = titleX + titleAdj.dx, originY = MARGIN + 60 + titleAdj.dy;
      let maxRunW = 0;
      titleFit.lines.forEach((ln, colIdx) => {
        ctx.save();
        ctx.translate(originX - colIdx * (size + colGap), originY);
        ctx.rotate(Math.PI / 2);
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 16;
        const runW = drawSpacedText(ln, 0, 0, { font: `700 ${size}px ${TITLE_FONT_STACK}`, spacing: 2, color: white, align: 'left' });
        ctx.restore();
        maxRunW = Math.max(maxRunW, runW);
      });
      // Axis-aligned approximation of the rotated columns: each extends
      // downward (screen +y) from its own origin, with the glyphs'
      // ascent/descent giving screen-x thickness, stacked leftward per
      // column — see the non-rotated title branches elsewhere for the same
      // approximation on a single column.
      const numCols = titleFit.lines.length;
      const totalW = (numCols - 1) * (size + colGap) + size;
      recordBounds('title', originX - (numCols - 1) * (size + colGap) - size * 0.2, originY, totalW, maxRunW);
    }
  }

  useLayer('dates');
  // ---- Vertical date, left side ----
  const datesAdj = adj('dates');
  const dateOverrideText = els.dateOverride.value.trim();
  const dateEndLabel = formatBannerDate(els.dateEnd.value, state.currentLang);
  // Sale mode never shows a start date — see buildInfoLineParts() for why.
  const dateText = state.bannerPurpose === 'sale'
    ? (dateOverrideText || formatSaleDeadline(dateEndLabel, state.currentLang))
    : (dateOverrideText || [formatBannerDate(els.dateStart.value, state.currentLang), dateEndLabel].filter(Boolean).join('  ―  '));
  if (dateText) {
    // Anchored at the top, rotated clockwise, so local +x runs downward the
    // screen — the string reads top-to-bottom in its natural left-to-right
    // order. The auto-formatted range is always short, but a free-text
    // override can be any length, so it's bounded (shrink, then truncate)
    // against the run of canvas available before the bottom ribbon band.
    const dOriginX = MARGIN + 20 + datesAdj.dx, dOriginY = MARGIN + 70 + datesAdj.dy;
    const maxDateRunW = Math.max(120, W - dOriginY - 150);
    // Fit at the BASE size first, then apply .scale afterward — see the
    // 情報帯型 date branches for why (feeding scale into the fit search's
    // startSize caps out silently once the natural fit is smaller than
    // the scaled request).
    const dateFit = fitFontSizeTruncate(dateText, maxDateRunW, 600, FONT_STACK, 28, 16, 0);
    const dateRunSize = dateFit.size * datesAdj.scale / 100;
    ctx.save();
    ctx.translate(dOriginX, dOriginY);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = white;
    ctx.font = `600 ${dateRunSize}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    const dateRunW = ctx.measureText(dateFit.text).width;
    ctx.fillText(dateFit.text, 0, 0);
    ctx.restore();
    ctx.shadowBlur = 0;
    recordBounds('dates', dOriginX - dateRunSize * 0.2, dOriginY, dateRunSize, dateRunW);
  }

  useLayer('decoration');
  // ---- Logo top-left ----
  const logoAdj = adj('logo');
  const tinted = tintedLogo(white, 32 * logoAdj.scale / 100);
  if (tinted) {
    const lx = MARGIN + logoAdj.dx, ly = MARGIN + logoAdj.dy;
    if (!logoAdj.hidden) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(tinted.canvas, lx, ly, tinted.w, tinted.h);
      ctx.restore();
    }
    recordBounds('logo', lx, ly, tinted.w, tinted.h);
  }

  // ---- Bottom ribbon band with CTA ----
  const bandH = 130;
  const bandTop = W - bandH;
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, bandTop, W, bandH);

  // Ribbon fold accents at both ends (darker triangles)
  const foldColor = rgbToHex(darkenRgb(accent, 0.25));
  const foldW = 22;
  ctx.fillStyle = foldColor;
  ctx.beginPath();
  ctx.moveTo(0, bandTop); ctx.lineTo(foldW, bandTop); ctx.lineTo(0, bandTop + foldW);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, bandTop); ctx.lineTo(W - foldW, bandTop); ctx.lineTo(W, bandTop + foldW);
  ctx.closePath(); ctx.fill();

  const bandTextColor = pickTextColor(accent);
  const bandTextHex = rgbToHex(bandTextColor);
  const ctaText = els.mainCopy.value || els.subCopy.value || saleCtaFallback();
  const ctaSourceV2 = els.mainCopy.value.trim() ? 'mainCopy' : 'subCopy';
  useLayer(ctaSourceV2);
  if (ctaText) {
    const ctaAdjV2 = adj(ctaSourceV2);
    // In sale mode the sale-tag/price pills sit in the band's bottom-right
    // corner — narrow the available width so a long mainCopy/subCopy
    // doesn't run under them.
    const ctaMaxW = (state.bannerPurpose === 'sale' && (saleTagText() || priceTagText())) ? W - 2 * MARGIN - 260 : W - 2 * MARGIN;
    const ctaFit = fitFontSizeTruncate(ctaText, ctaMaxW, 800, FONT_STACK, 40, 24, 0);
    const ctaSizeV2 = ctaFit.size * ctaAdjV2.scale / 100;
    ctx.font = `800 ${ctaSizeV2}px ${FONT_STACK}`;
    ctx.fillStyle = bandTextHex;
    ctx.textAlign = 'center';
    const ctaCx = (state.bannerPurpose === 'sale' && (saleTagText() || priceTagText()) ? W / 2 - 130 : W / 2) + ctaAdjV2.dx;
    const ctaCy = bandTop + bandH / 2 - 6 + ctaAdjV2.dy;
    ctx.fillText(ctaFit.text, ctaCx, ctaCy);
    const ctaWV2 = ctx.measureText(ctaFit.text).width;
    recordBounds(ctaSourceV2, ctaCx - ctaWV2 / 2, ctaCy - ctaSizeV2 * 0.8, ctaWV2, ctaSizeV2);
  }
  if (els.subCopy.value && ctaText !== els.subCopy.value) {
    const subCopyAdj = adj('subCopy');
    useLayer('subCopy');
    const subSizeV2 = Math.round(22 * subCopyAdj.scale / 100);
    ctx.font = `400 ${subSizeV2}px ${FONT_STACK}`;
    ctx.fillStyle = bandTextHex;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'center';
    const subCx = (state.bannerPurpose === 'sale' && (saleTagText() || priceTagText()) ? W / 2 - 130 : W / 2) + subCopyAdj.dx;
    const subCy = bandTop + bandH / 2 + 26 + subCopyAdj.dy;
    ctx.fillText(els.subCopy.value, subCx, subCy);
    const subWV2 = ctx.measureText(els.subCopy.value).width;
    ctx.globalAlpha = 1;
    recordBounds('subCopy', subCx - subWV2 / 2, subCy - subSizeV2 * 0.8, subWV2, subSizeV2);
  }

  useLayer('venue');
  // ---- Venue name, just above the band (not shown at all in sale mode) ----
  const venueLine = state.bannerPurpose === 'sale' ? '' : els.venue.value.trim();
  if (venueLine) {
    ctx.font = `600 24px ${FONT_STACK}`;
    ctx.fillStyle = white;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(venueLine, MARGIN, bandTop - 18);
    ctx.shadowBlur = 0;
  }

  // ---- Sale-tag + price pills, bottom-right corner of the band ----
  // Copyright sits bottom-left here, so the right side is free — reads as
  // a small CTA-button cluster in the corner. White pill background (with
  // accent-colored tag text) rather than an accent-on-accent pill, since
  // this band IS accentHex — a colored pill would disappear into it.
  if (state.bannerPurpose === 'sale') {
    drawSaleBadges(W - MARGIN, W - 32, 'right', '#ffffff', accentHex, 15);
  }

  useLayer('copyright');
  // ---- Copyright, bottom-left, small ----
  if (els.copyright.value.trim()) {
    const crAdj = adj('copyright');
    ctx.save();
    const crSize = Math.round(18 * crAdj.scale / 100);
    ctx.font = `500 ${crSize}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = white;
    ctx.globalAlpha = 0.7;
    const crX = MARGIN + crAdj.dx, crY = W - 20 + crAdj.dy;
    ctx.fillText(els.copyright.value, crX, crY);
    const crW = ctx.measureText(els.copyright.value).width;
    ctx.restore();
    recordBounds('copyright', crX, crY - crSize * 0.8, crW, crSize);
  }

  useLayer('extraText');
  // Additional free-text item — small print, defaults just above copyright.
  if (els.extraText.value.trim()) {
    const etAdj = adj('extraText');
    ctx.save();
    const etSize = Math.round(18 * etAdj.scale / 100);
    ctx.font = `500 ${etSize}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = white;
    ctx.globalAlpha = 0.7;
    const etX = MARGIN + etAdj.dx, etY = W - 20 - 26 + etAdj.dy;
    ctx.fillText(els.extraText.value, etX, etY);
    const etW = ctx.measureText(els.extraText.value).width;
    ctx.restore();
    recordBounds('extraText', etX, etY - etSize * 0.8, etW, etSize);
  }
}

// ---------- Template 5: cyber UI, full-bleed ----------
// SF / near-future layout. Artwork fills the canvas; HUD-style corner
// brackets and scattered pseudo system-readout labels give a tech feel; the
// catchphrase sits center-to-bottom with a CTA badge.
function renderCyberUiTemplate() {
  const W = CANVAS_SIZE;
  const MARGIN = 56;

  const accent = state.colors.accent;
  const accentHex = rgbToHex(accent);
  const white = '#ffffff';
  const mono = '"SF Mono", "Menlo", "Courier New", monospace';

  ctx.clearRect(0, 0, W, W);

  // Solid base fill on the always-visible 'background' layer — this template
  // is normally full-bleed art with nothing behind it, so hiding 素材 via
  // the adjustment panel's 非表示 checkbox would otherwise leave a fully
  // transparent hole instead of falling back to a solid color like every
  // other adjustable element does when hidden.
  useLayer('background');
  ctx.fillStyle = rgbToHex(state.colors.bg);
  ctx.fillRect(0, 0, W, W);

  useLayer('artwork');
  if (state.artImage) {
    const artAdj = adj('art');
    drawCoverImage(state.artImage, 0, 0, W, W, artAdj.scale / 100, artAdj.dx, artAdj.dy);
    recordBounds('art', 0, 0, W, W);
  } else {
    ctx.save();
    ctx.strokeStyle = '#999';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(MARGIN, MARGIN, W - 2 * MARGIN, W - 2 * MARGIN);
    ctx.fillStyle = '#999';
    ctx.font = `400 20px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('素材をアップロード', W / 2, W / 2);
    ctx.restore();
  }

  useLayer('decoration');
  // Bottom scrim so the catchphrase stays legible over busy art
  const bottomScrim = ctx.createLinearGradient(0, W * 0.42, 0, W);
  bottomScrim.addColorStop(0, 'rgba(6,10,14,0)');
  bottomScrim.addColorStop(1, 'rgba(6,10,14,0.72)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, W * 0.42, W, W * 0.58);

  // ---- HUD corner brackets ----
  const bl = 34; // bracket leg length
  const inset = MARGIN - 18;
  ctx.save();
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  const corners = [
    [[inset, inset + bl], [inset, inset], [inset + bl, inset]],
    [[W - inset - bl, inset], [W - inset, inset], [W - inset, inset + bl]],
    [[inset, W - inset - bl], [inset, W - inset], [inset + bl, W - inset]],
    [[W - inset - bl, W - inset], [W - inset, W - inset], [W - inset, W - inset - bl]]
  ];
  corners.forEach(pts => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.stroke();
  });
  ctx.restore();

  useLayer('decoration');
  // ---- Scattered pseudo system-UI labels ----
  // Template flavor text, not tied to any one input field — stays with
  // the other decorative HUD elements rather than a per-field text layer.
  const now = new Date();
  const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const snippets = [
    { text: 'ERROR CODE 000.', x: W - MARGIN - 4, y: MARGIN + 66, align: 'right' },
    { text: `SYSTEM-TT / ${stamp}`, x: MARGIN + 4, y: W * 0.48, align: 'left' },
    { text: 'SCANNING...', x: W - MARGIN - 4, y: W * 0.55, align: 'right' }
  ];
  ctx.font = `400 15px ${mono}`;
  ctx.globalAlpha = 0.62;
  snippets.forEach(s => {
    ctx.fillStyle = accentHex;
    ctx.textAlign = s.align;
    ctx.fillText(s.text, s.x, s.y);
  });
  ctx.globalAlpha = 1;

  // CTA badge dimensions are computed first (though drawn after the title,
  // see below) purely so the title's headline knows where the badge's left
  // edge is and can wrap before running under it, instead of overlapping.
  const subCopyAdj = adj('subCopy');
  // This permanent HUD badge always shows subCopy (regardless of banner
  // purpose) — the dedicated sale-tag/price pills (below) are a separate
  // element, not a replacement, so subCopy keeps working here exactly like
  // it does in 集客 mode.
  const ctaLabel = (els.subCopy.value || 'ONLINE SALE').toUpperCase();
  const ctaFontSize = 17 * subCopyAdj.scale / 100;
  ctx.font = `700 ${ctaFontSize}px ${mono}`;
  const ctaW = ctx.measureText(ctaLabel).width;
  const padX = 14, padY = 9;
  const badgeW = ctaW + padX * 2, badgeH = ctaFontSize + padY * 2;
  const badgeX = W - inset - bl - 14 - badgeW + subCopyAdj.dx;
  const badgeY = inset - 6 + subCopyAdj.dy;

  useLayer('title');
  // ---- Title: small "[ EXHIBITION ]" kicker + large bold headline ----
  // Previously this whole thing was a single 18px mono tag — technically
  // "the title was there", but at ad-feed scale it was effectively
  // invisible, so a viewer scrolling past had no quick way to tell what the
  // banner was even for. The kicker keeps the HUD flavor; the headline
  // underneath is sized and weighted like every other template's title.
  const lines = els.title.value.split('\n').map(s => s.trim()).filter(Boolean);
  const titleText = (lines[0] || '').toUpperCase();
  const titleLeft = inset + bl + 14;
  const kickerY = inset + 8;
  const titleAdj = adj('title');
  if (titleText) {
    ctx.font = `700 15px ${mono}`;
    ctx.fillStyle = accentHex;
    ctx.textAlign = 'left';
    ctx.fillText('[ EXHIBITION ]', titleLeft + titleAdj.dx, kickerY + titleAdj.dy);

    const isCjkLang = ['ja', 'zh-Hans', 'zh-Hant'].includes(state.currentLang);
    // Stay clear of the CTA badge's column for the whole block, not just the
    // first line — simpler than tracking per-line collision, at the minor
    // cost of wrapping a long title slightly narrower than the full canvas.
    // fitFontSizeWrap (rather than the plain wrapFn+slice(0,2) this used to
    // use) guarantees a fit within 2 lines — the old version silently
    // dropped any text past line 2 with no truncation mark if the title was
    // long enough to need a 3rd line.
    const titleMaxW = Math.max(240, badgeX - titleLeft - 24);
    const titleFit = fitFontSizeWrap(titleText, titleMaxW, 700, TITLE_FONT_STACK, 58, state.titleNoWrap ? 14 : 32, 1, state.titleNoWrap ? 1 : 2, isCjkLang);
    const size = titleFit.size * titleAdj.scale / 100;
    ctx.font = `700 ${size}px ${TITLE_FONT_STACK}`;
    ctx.fillStyle = white;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 14;
    const lineH = size * 1.1;
    let ty = kickerY + size * 0.9 + titleAdj.dy;
    const titleStartTy = ty;
    titleFit.lines.forEach(ln => { ctx.fillText(ln, titleLeft + titleAdj.dx, ty); ty += lineH; });
    ctx.shadowBlur = 0;
    const titleW = Math.max(1, ...titleFit.lines.map(ln => ctx.measureText(ln).width));
    recordBounds('title', titleLeft + titleAdj.dx, titleStartTy - size * 0.8, titleW, titleFit.lines.length * lineH);
  }

  useLayer('decoration');
  ctx.save();
  ctx.fillStyle = 'rgba(6,10,14,0.55)';
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(badgeX + 0.5, badgeY + 0.5, badgeW - 1, badgeH - 1);
  ctx.restore();
  useLayer('subCopy');
  ctx.save();
  ctx.font = `700 ${ctaFontSize}px ${mono}`;
  ctx.fillStyle = accentHex;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(ctaLabel, badgeX + padX, badgeY + badgeH / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
  recordBounds('subCopy', badgeX, badgeY, badgeW, badgeH);

  useLayer('mainCopy');
  // ---- Catchphrase, center-to-bottom ----
  const mainCopy = els.mainCopy.value;
  if (mainCopy) {
    const mainCopyAdj = adj('mainCopy');
    const maxW = W - 2 * MARGIN - 2 * bl;
    let font = `700 ${Math.round(46 * mainCopyAdj.scale / 100)}px ${TITLE_FONT_STACK}`;
    let copyLines;
    if (state.mainCopyNoWrap) {
      const fit = fitFontSizeTruncate(mainCopy, maxW, 700, TITLE_FONT_STACK, 46, 10, 0);
      font = `700 ${fit.size * mainCopyAdj.scale / 100}px ${TITLE_FONT_STACK}`;
      copyLines = [fit.text];
    } else {
      ctx.font = font;
      copyLines = wrapText(mainCopy, maxW, font);
    }
    const lineH = 56;
    let ty = W - MARGIN - bl - 96 - (copyLines.length - 1) * lineH;
    const mainStartTy = ty;
    ctx.textAlign = 'center';
    ctx.fillStyle = white;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
    copyLines.forEach(ln => { ctx.fillText(ln, W / 2 + mainCopyAdj.dx, ty + mainCopyAdj.dy); ty += lineH; });
    ctx.shadowBlur = 0;
    const mainSize = 46 * mainCopyAdj.scale / 100;
    const mainW = Math.max(1, ...copyLines.map(ln => ctx.measureText(ln).width));
    recordBounds('mainCopy', W / 2 + mainCopyAdj.dx - mainW / 2, mainStartTy + mainCopyAdj.dy - mainSize * 0.8, mainW, copyLines.length * lineH);
  }

  // ---- Venue / dates readout, monospace, below catchphrase ----
  const infoParts = buildInfoLineParts();
  if (infoParts.length) {
    const datesAdj = adj('dates');
    const infoSize = Math.round(20 * datesAdj.scale / 100);
    const infoX = W / 2 + datesAdj.dx, infoY = W - MARGIN - bl - 40 + datesAdj.dy;
    const infoW = drawInfoLine(infoParts, infoX, infoY, `500 ${infoSize}px ${mono}`, accentHex, 'center', '   //   ', 0.9, W - 2 * MARGIN - 2 * bl);
    recordBounds('dates', infoX - infoW / 2, infoY - infoSize * 0.8, infoW, infoSize);
  }

  // Sale-tag + price pills, bottom-right, above copyright — reads as a
  // small CTA-button cluster in the HUD frame's corner.
  if (state.bannerPurpose === 'sale') {
    drawSaleBadges(W - inset - bl - 14, W - inset - bl - 40, 'right', accentHex, white, 18);
  }

  useLayer('copyright');
  // ---- Copyright, bottom-right, tiny ----
  if (els.copyright.value.trim()) {
    const crAdj = adj('copyright');
    const crSize = Math.round(15 * crAdj.scale / 100);
    ctx.font = `400 ${crSize}px ${mono}`;
    ctx.fillStyle = white;
    ctx.textAlign = 'right';
    ctx.globalAlpha = 0.55;
    const crX = W - inset - bl - 14 + crAdj.dx;
    const crY = W - inset - bl - 14 + crAdj.dy;
    ctx.fillText(els.copyright.value, crX, crY);
    const crW = ctx.measureText(els.copyright.value).width;
    ctx.globalAlpha = 1;
    recordBounds('copyright', crX - crW, crY - crSize * 0.8, crW, crSize);
  }

  useLayer('extraText');
  // Additional free-text item — small print, defaults just above copyright.
  if (els.extraText.value.trim()) {
    const etAdj = adj('extraText');
    const etSize = Math.round(15 * etAdj.scale / 100);
    ctx.font = `400 ${etSize}px ${mono}`;
    ctx.fillStyle = white;
    ctx.textAlign = 'right';
    ctx.globalAlpha = 0.55;
    const etX = W - inset - bl - 14 + etAdj.dx;
    const etY = W - inset - bl - 14 - 22 + etAdj.dy;
    ctx.fillText(els.extraText.value, etX, etY);
    const etW = ctx.measureText(els.extraText.value).width;
    ctx.globalAlpha = 1;
    recordBounds('extraText', etX - etW, etY - etSize * 0.8, etW, etSize);
  }
}

// ---------- Events ----------

// If auto-select is on, pick a template from the current palette and reflect
// it in the dropdown. Called after every (re-)extraction from the artwork.
function maybeAutoSelectTemplate() {
  if (!els.autoTemplateCheckbox.checked) return;
  const picked = classifyTemplateFromPalette(state.colors.bg, state.colors.accent, state.colors.accentRaw);
  state.template = picked;
  els.templateSelect.value = picked;
}

els.artFile.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      state.artImage = img;
      const palette = extractPalette(img);
      state.colors.bg = palette.bg;
      state.colors.accent = palette.accent;
      state.colors.accentRaw = palette.accentRaw;
      state.textOverride = null;
      syncColorPickers();
      maybeAutoSelectTemplate();
      render();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

els.resetColors.addEventListener('click', () => {
  if (!state.artImage) return;
  const palette = extractPalette(state.artImage);
  state.colors.bg = palette.bg;
  state.colors.accent = palette.accent;
  state.colors.accentRaw = palette.accentRaw;
  state.textOverride = null;
  syncColorPickers();
  maybeAutoSelectTemplate();
  render();
});

els.templateSelect.addEventListener('change', () => {
  // A manual pick is an explicit override — stop auto-selecting until the
  // user re-enables it or uploads a new image.
  els.autoTemplateCheckbox.checked = false;
  state.template = els.templateSelect.value;
  render();
});

els.autoTemplateCheckbox.addEventListener('change', () => {
  if (els.autoTemplateCheckbox.checked && state.artImage) {
    maybeAutoSelectTemplate();
    render();
  }
});

els.bgPicker.addEventListener('input', () => { state.colors.bg = hexToRgb(els.bgPicker.value); render(); });
els.accentPicker.addEventListener('input', () => { state.colors.accent = hexToRgb(els.accentPicker.value); render(); });
els.textPicker.addEventListener('input', () => { state.textOverride = hexToRgb(els.textPicker.value); render(); });

// ---------- Layout adjustment panel (版元 feedback, per-project) ----------
// Field ids follow adj{Category}{Scale|Dx|Dy|Hidden}, matching
// state.adjustments' keys 1:1, so this can bind all rows generically instead
// of one hand-written listener set per category.
const ADJUSTMENT_CATEGORIES = ['logo', 'copyright', 'title', 'mainCopy', 'subCopy', 'dates', 'extraText', 'art', 'venue', 'saleTag'];

// Pushes state.adjustments[cat] into its <input>s — used after any
// non-typing change (canvas drag, wheel-resize, reset) so the panel never
// drifts out of sync with what's actually being rendered.
function syncAdjustmentInputs(cat) {
  const idBase = 'adj' + cat[0].toUpperCase() + cat.slice(1);
  const a = state.adjustments[cat];
  const scaleEl = document.getElementById(idBase + 'Scale');
  const dxEl = document.getElementById(idBase + 'Dx');
  const dyEl = document.getElementById(idBase + 'Dy');
  const hiddenEl = document.getElementById(idBase + 'Hidden');
  if (scaleEl) scaleEl.value = a.scale;
  if (dxEl) dxEl.value = a.dx;
  if (dyEl) dyEl.value = a.dy;
  if (hiddenEl) hiddenEl.checked = !!a.hidden;
}

// ---------- Undo/redo for adjustments ----------
// Snapshots the whole state.adjustments object rather than diffing individual
// fields — it's only 6 categories × 3 numbers, so cloning it is cheap, and a
// full snapshot means a single undo step always restores every category
// consistently (e.g. after a reset, which touches all 6 at once).
//
// Rapid-fire changes — the many mousemove events in one drag, repeated wheel
// ticks, or every keystroke while typing into a number field — are coalesced
// into a single undo step rather than one step per event, matching how a
// user thinks of "one drag" or "one edit" as one undo-able action. This is
// done by only taking the "before" snapshot for the *first* change since the
// last commit, then committing it to the undo stack either immediately (drag
// mouseup, reset — both have a clear end) or after a short quiet period
// (wheel, typing — neither has an explicit "done" event).
const UNDO_COALESCE_MS = 500;
const UNDO_MAX = 100;
let undoStack = [];
let redoStack = [];
let pendingUndoSnapshot = null;
let undoCoalesceTimer = null;

function cloneAdjustments() {
  return JSON.parse(JSON.stringify(state.adjustments));
}

function updateUndoRedoButtons() {
  els.undoAdjustmentsBtn.disabled = undoStack.length === 0 && !pendingUndoSnapshot;
  els.redoAdjustmentsBtn.disabled = redoStack.length === 0;
}

// Call once, right before mutating state.adjustments, to make that mutation
// undoable. Safe to call many times in a row for what's conceptually one
// action — only the first call in a burst actually records a snapshot.
function recordAdjustmentChange() {
  if (!pendingUndoSnapshot) pendingUndoSnapshot = cloneAdjustments();
  redoStack = []; // a fresh change invalidates whatever redo history existed
  clearTimeout(undoCoalesceTimer);
  undoCoalesceTimer = setTimeout(commitAdjustmentUndoGroup, UNDO_COALESCE_MS);
  updateUndoRedoButtons();
}

// Closes the current coalescing group immediately — call after an action
// with a clear end point (drag mouseup, reset) instead of waiting out the
// debounce timer.
function commitAdjustmentUndoGroup() {
  clearTimeout(undoCoalesceTimer);
  if (!pendingUndoSnapshot) return;
  undoStack.push(pendingUndoSnapshot);
  if (undoStack.length > UNDO_MAX) undoStack.shift();
  pendingUndoSnapshot = null;
  updateUndoRedoButtons();
}

function undoAdjustment() {
  commitAdjustmentUndoGroup();
  const prev = undoStack.pop();
  if (!prev) return;
  redoStack.push(cloneAdjustments());
  state.adjustments = prev;
  ADJUSTMENT_CATEGORIES.forEach(syncAdjustmentInputs);
  render();
  updateUndoRedoButtons();
}

function redoAdjustment() {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(cloneAdjustments());
  state.adjustments = next;
  ADJUSTMENT_CATEGORIES.forEach(syncAdjustmentInputs);
  render();
  updateUndoRedoButtons();
}

els.undoAdjustmentsBtn.addEventListener('click', undoAdjustment);
els.redoAdjustmentsBtn.addEventListener('click', redoAdjustment);
updateUndoRedoButtons();

// Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z (or Ctrl+Y) undo/redo the adjustment panel —
// but only outside genuine text-editing fields (title, venue, copy, dates),
// so the browser's own text-undo keeps working there as expected.
function isTextEditingContext() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.isContentEditable) return true;
  if (el.tagName === 'INPUT') {
    const type = (el.type || 'text').toLowerCase();
    return !['number', 'range', 'checkbox', 'radio', 'button', 'submit', 'file'].includes(type);
  }
  return false;
}
window.addEventListener('keydown', (evt) => {
  const key = evt.key.toLowerCase();
  const isUndo = (evt.metaKey || evt.ctrlKey) && key === 'z' && !evt.shiftKey;
  const isRedo = (evt.metaKey || evt.ctrlKey) && ((key === 'z' && evt.shiftKey) || key === 'y');
  if (!isUndo && !isRedo) return;
  if (isTextEditingContext()) return;
  evt.preventDefault();
  if (isRedo) redoAdjustment(); else undoAdjustment();
});

ADJUSTMENT_CATEGORIES.forEach(cat => {
  const idBase = 'adj' + cat[0].toUpperCase() + cat.slice(1);
  const scaleEl = document.getElementById(idBase + 'Scale');
  const dxEl = document.getElementById(idBase + 'Dx');
  const dyEl = document.getElementById(idBase + 'Dy');
  [
    [scaleEl, 'scale'], [dxEl, 'dx'], [dyEl, 'dy']
  ].forEach(([el, key]) => {
    if (!el) return;
    el.addEventListener('input', () => {
      recordAdjustmentChange();
      const n = Number(el.value);
      state.adjustments[cat][key] = Number.isFinite(n) ? n : (key === 'scale' ? 100 : 0);
      render();
    });
  });
  // Checkbox toggle is a single discrete action (unlike typing), so it
  // commits its own undo step immediately rather than waiting for the
  // debounce timer used for coalescing keystrokes/drag/wheel.
  const hiddenEl = document.getElementById(idBase + 'Hidden');
  if (hiddenEl) {
    hiddenEl.addEventListener('change', () => {
      recordAdjustmentChange();
      state.adjustments[cat].hidden = hiddenEl.checked;
      commitAdjustmentUndoGroup();
      render();
    });
  }
});

els.resetAdjustmentsBtn.addEventListener('click', () => {
  recordAdjustmentChange();
  ADJUSTMENT_CATEGORIES.forEach(cat => {
    state.adjustments[cat] = { scale: 100, dx: 0, dy: 0, hidden: false };
    syncAdjustmentInputs(cat);
  });
  commitAdjustmentUndoGroup();
  render();
});

// ---------- Adjustment presets (版元ごとに保存・再利用) ----------
// Saved to localStorage — this browser/machine only, no backend, matching
// the rest of the app's zero-server design (and meaning presets are NOT
// shared with teammates or available in a fresh browser profile). Only
// state.adjustments is saved, not text/template/colors/artwork — the point
// is reusing a 版元's layout corrections (position/size/hidden) across
// different projects, which will each have their own title/copy/artwork.
const ADJUST_PRESET_STORAGE_KEY = 'gaaat-banner-tool:adjustment-presets';

function loadAdjustPresets() {
  try {
    const raw = localStorage.getItem(ADJUST_PRESET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveAdjustPresets(presets) {
  try {
    localStorage.setItem(ADJUST_PRESET_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (e) {
    return false;
  }
}

function renderAdjustPresetOptions(selectName) {
  const presets = loadAdjustPresets();
  const names = Object.keys(presets).sort((a, b) => a.localeCompare(b, 'ja'));
  els.adjustPresetSelect.innerHTML = '<option value="">（保存済みプリセットを選択）</option>';
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    els.adjustPresetSelect.appendChild(opt);
  });
  if (selectName && names.includes(selectName)) els.adjustPresetSelect.value = selectName;
}

function showAdjustPresetStatus(text, isError) {
  els.adjustPresetStatus.style.display = '';
  els.adjustPresetStatus.classList.toggle('error', !!isError);
  els.adjustPresetStatus.textContent = text;
}

els.saveAdjustPresetBtn.addEventListener('click', () => {
  const name = els.adjustPresetNameInput.value.trim();
  if (!name) {
    showAdjustPresetStatus('プリセット名を入力してください。', true);
    return;
  }
  const presets = loadAdjustPresets();
  if (presets[name] && !confirm(`「${name}」は既に保存されています。上書きしますか？`)) return;
  presets[name] = JSON.parse(JSON.stringify(state.adjustments));
  if (!saveAdjustPresets(presets)) {
    showAdjustPresetStatus('保存に失敗しました（ブラウザのストレージ容量やプライベートブラウジング設定をご確認ください）。', true);
    return;
  }
  renderAdjustPresetOptions(name);
  showAdjustPresetStatus(`「${name}」として保存しました。`, false);
});

els.loadAdjustPresetBtn.addEventListener('click', () => {
  const name = els.adjustPresetSelect.value;
  if (!name) {
    showAdjustPresetStatus('読み込むプリセットを選択してください。', true);
    return;
  }
  const preset = loadAdjustPresets()[name];
  if (!preset) {
    showAdjustPresetStatus('選択したプリセットが見つかりませんでした。', true);
    return;
  }
  recordAdjustmentChange();
  // Merge against the CURRENT category list, not just whatever the saved
  // preset happens to contain — a preset saved before a category existed
  // (会期情報/追加テキスト were both added mid-session) should still apply
  // cleanly, with the missing category just falling back to the neutral
  // default instead of throwing or leaving it unset.
  ADJUSTMENT_CATEGORIES.forEach(cat => {
    const saved = preset[cat];
    state.adjustments[cat] = saved
      ? { scale: saved.scale ?? 100, dx: saved.dx ?? 0, dy: saved.dy ?? 0, hidden: !!saved.hidden }
      : { scale: 100, dx: 0, dy: 0, hidden: false };
    syncAdjustmentInputs(cat);
  });
  commitAdjustmentUndoGroup();
  render();
  showAdjustPresetStatus(`「${name}」を読み込みました。`, false);
});

els.deleteAdjustPresetBtn.addEventListener('click', () => {
  const name = els.adjustPresetSelect.value;
  if (!name) {
    showAdjustPresetStatus('削除するプリセットを選択してください。', true);
    return;
  }
  if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return;
  const presets = loadAdjustPresets();
  delete presets[name];
  saveAdjustPresets(presets);
  renderAdjustPresetOptions();
  showAdjustPresetStatus(`「${name}」を削除しました。`, false);
});

renderAdjustPresetOptions();

// ---------- Canvas drag/scroll interaction ----------
// Lets the user grab any adjustable element directly on the banner instead
// of typing dx/dy/scale into the panel. Hit-tests against
// state.elementBounds, which every render() repopulates fresh from the
// actual draw calls (see recordBounds() sprinkled through the template
// functions) — so a drag always grabs whatever's really on screen, in
// whichever language/template is currently showing, not a stale guess.
function getCanvasCoords(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (CANVAS_SIZE / rect.width),
    y: (evt.clientY - rect.top) * (CANVAS_SIZE / rect.height)
  };
}

// Later recordBounds() calls come from later draw calls, which paint over
// earlier ones — so walking keys in reverse insertion order doubles as
// picking whatever's visually on top at that point.
function hitTest(x, y) {
  const keys = Object.keys(state.elementBounds);
  for (let i = keys.length - 1; i >= 0; i--) {
    const b = state.elementBounds[keys[i]];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return keys[i];
  }
  return null;
}

let currentAdjustKey = null;

function updateAdjustHighlight(key) {
  currentAdjustKey = key;
  if (!key || !state.elementBounds[key]) {
    els.adjustHighlight.style.display = 'none';
    return;
  }
  const b = state.elementBounds[key];
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width / CANVAS_SIZE, sy = rect.height / CANVAS_SIZE;
  els.adjustHighlight.style.display = 'block';
  els.adjustHighlight.style.left = (b.x * sx) + 'px';
  els.adjustHighlight.style.top = (b.y * sy) + 'px';
  els.adjustHighlight.style.width = Math.max(0, b.w * sx) + 'px';
  els.adjustHighlight.style.height = Math.max(0, b.h * sy) + 'px';
  els.adjustHighlightLabel.textContent = ADJUSTMENT_LABELS[key] || key;
}

// Canva/Figma-style snap guides: while dragging (moving, not resizing) an
// element, check its LEFT/CENTER/RIGHT (x) and TOP/CENTER/BOTTOM (y)
// against the same three positions on the canvas's own center line and
// every other currently-visible element — not just center-to-center. This
// one mechanism covers every "these two should line up" case someone
// drags for: centers matching (put this dead center, or on the same row
// as that other line of text), tops or bottoms matching ("高さを揃えた" —
// two elements sitting at the same level even if their own heights
// differ), and one element's edge meeting another's ("上と下のテキストが
// 重なった瞬間" — stacking two lines with zero gap between them). Guide
// lines are positioned via JS, not a fixed 50%, since the matched target
// isn't always the canvas midpoint.
const SNAP_PX = 6;

function collectSnapTargets(excludeKey, axis) {
  const targets = [CANVAS_SIZE / 2];
  Object.keys(state.elementBounds).forEach(k => {
    if (k === excludeKey || adj(k).hidden) return;
    const b = state.elementBounds[k];
    if (axis === 'x') targets.push(b.x, b.x + b.w / 2, b.x + b.w);
    else targets.push(b.y, b.y + b.h / 2, b.y + b.h);
  });
  return targets;
}

// Tries every (candidate, target) pair and keeps the closest one within
// SNAP_PX — candidates are the dragged element's own left/center/right (or
// top/center/bottom), so e.g. its top edge can snap to another element's
// bottom edge, not just like-to-like.
function bestSnap(candidates, targets) {
  let best = null;
  candidates.forEach(c => {
    targets.forEach(t => {
      const delta = t - c;
      if (Math.abs(delta) < SNAP_PX && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, target: t };
      }
    });
  });
  return best;
}

function applyCenterSnapAndGuides(key) {
  const b = state.elementBounds[key];
  if (!b) { hideCenterGuides(); return; }
  const xCandidates = [b.x, b.x + b.w / 2, b.x + b.w];
  const yCandidates = [b.y, b.y + b.h / 2, b.y + b.h];
  const xBest = bestSnap(xCandidates, collectSnapTargets(key, 'x'));
  const yBest = bestSnap(yCandidates, collectSnapTargets(key, 'y'));
  let snapped = false;
  if (xBest) { state.adjustments[key].dx += Math.round(xBest.delta); snapped = true; }
  if (yBest) { state.adjustments[key].dy += Math.round(yBest.delta); snapped = true; }
  if (snapped) render();
  updateGuideLines(xBest ? xBest.target : null, yBest ? yBest.target : null);
}

// Nudges state.adjustments[key].scale until getEdge() lands on `target`,
// by measuring the relationship empirically (render, read the edge, try
// a nearby scale, read again) rather than assuming a formula. Deliberately
// not a closed-form calculation: different templates position text
// differently — some draw a symmetric box around a fixed center, others
// anchor to a baseline (where growing the font moves the top edge up much
// more than the bottom edge moves down) — so "half the new height" isn't
// the same offset from center for every element. Two render passes to
// measure the local slope, then a third to correct for any nonlinearity,
// is cheap and works regardless of which positioning scheme the template
// underneath happens to use.
function snapScaleToEdgeTarget(key, getEdge, target) {
  const adj = state.adjustments[key];
  const s0 = adj.scale;
  const e0 = getEdge();
  const probeScale = Math.max(5, Math.min(1000, Math.round(s0 * 1.05)));
  if (probeScale === s0) return false;
  adj.scale = probeScale;
  render();
  const e1 = getEdge();
  const slope = (e1 - e0) / (probeScale - s0);
  if (!isFinite(slope) || slope === 0) { adj.scale = s0; render(); return false; }
  let scale = Math.max(5, Math.min(1000, Math.round(s0 + (target - e0) / slope)));
  adj.scale = scale;
  render();
  const e2 = getEdge();
  if (Math.abs(e2 - target) > 0.75 && Math.abs(e2 - e1) > 0.001) {
    const slope2 = (e2 - e1) / (scale - probeScale);
    if (isFinite(slope2) && slope2 !== 0) {
      const scale2 = Math.max(5, Math.min(1000, Math.round(scale + (target - e2) / slope2)));
      adj.scale = scale2;
      render();
    }
  }
  return true;
}

// Corner-resize counterpart of applyCenterSnapAndGuides — the drag itself
// only ever moves ONE edge at a time (whichever corner is being dragged),
// so this snaps that one edge to line up with another element's top/
// center/bottom (or left/center/right) — e.g. drag a text's top-left
// corner until its top edge matches another line's top edge, to make two
// different-sized texts read at "the same height". Only one axis is
// satisfied per drag: vertical takes priority since "揃えて高さを揃える"
// is the explicit ask, horizontal only gets a turn when nothing vertical
// is close enough to snap to.
function applyResizeSnapAndGuides(key, corner) {
  const b = state.elementBounds[key];
  if (!b || !corner) { hideCenterGuides(); return; }
  const isNorth = corner.includes('n');
  const isWest = corner.includes('w');
  const getYEdge = () => { const bb = state.elementBounds[key]; return isNorth ? bb.y : bb.y + bb.h; };
  const getXEdge = () => { const bb = state.elementBounds[key]; return isWest ? bb.x : bb.x + bb.w; };
  const yBest = bestSnap([getYEdge()], collectSnapTargets(key, 'y'));
  const xBest = yBest ? null : bestSnap([getXEdge()], collectSnapTargets(key, 'x'));
  if (yBest) snapScaleToEdgeTarget(key, getYEdge, yBest.target);
  else if (xBest) snapScaleToEdgeTarget(key, getXEdge, xBest.target);
  updateGuideLines(yBest ? null : (xBest ? xBest.target : null), yBest ? yBest.target : null);
}

function updateGuideLines(xTarget, yTarget) {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width / CANVAS_SIZE, sy = rect.height / CANVAS_SIZE;
  if (xTarget !== null) {
    els.centerGuideV.style.left = (xTarget * sx) + 'px';
    els.centerGuideV.style.display = 'block';
  } else {
    els.centerGuideV.style.display = 'none';
  }
  if (yTarget !== null) {
    els.centerGuideH.style.top = (yTarget * sy) + 'px';
    els.centerGuideH.style.display = 'block';
  } else {
    els.centerGuideH.style.display = 'none';
  }
}
function hideCenterGuides() {
  els.centerGuideV.style.display = 'none';
  els.centerGuideH.style.display = 'none';
}

const dragState = { key: null, startX: 0, startY: 0, startDx: 0, startDy: 0 };
// Corner-handle resize: dragging a corner scales the element based on how
// far that corner moves relative to the box's own center — the same .scale
// value the numeric field and wheel-resize already control, just driven by
// a corner drag instead. centerX/centerY/startDist are captured once at
// mousedown so the reference point doesn't drift as the box itself resizes
// mid-drag.
const resizeState = { key: null, corner: null, centerX: 0, centerY: 0, startDist: 0, startScale: 100 };

canvas.addEventListener('mousedown', (evt) => {
  const { x, y } = getCanvasCoords(evt);
  const key = hitTest(x, y);
  if (!key) return;
  evt.preventDefault();
  dragState.key = key;
  dragState.startX = x;
  dragState.startY = y;
  dragState.startDx = state.adjustments[key].dx;
  dragState.startDy = state.adjustments[key].dy;
  els.adjustHighlight.classList.add('dragging');
});

canvas.addEventListener('mousemove', (evt) => {
  if (dragState.key || resizeState.key) return; // tracked by the window-level listener below
  const { x, y } = getCanvasCoords(evt);
  const key = hitTest(x, y);
  canvas.classList.toggle('adjust-hoverable', !!key);
  updateAdjustHighlight(key);
});

// Each corner handle starts a resize on whichever element is currently
// highlighted (canvas's own hover tracking already keeps that in sync).
document.querySelectorAll('#adjustHighlight .resize-handle').forEach(handle => {
  handle.addEventListener('mousedown', (evt) => {
    const key = currentAdjustKey;
    if (!key) return;
    evt.preventDefault();
    evt.stopPropagation();
    const corner = handle.dataset.corner;
    const b = state.elementBounds[key];
    resizeState.key = key;
    resizeState.corner = corner;
    resizeState.centerX = b.x + b.w / 2;
    resizeState.centerY = b.y + b.h / 2;
    const cornerX = corner.includes('e') ? b.x + b.w : b.x;
    const cornerY = corner.includes('s') ? b.y + b.h : b.y;
    resizeState.startDist = Math.hypot(cornerX - resizeState.centerX, cornerY - resizeState.centerY) || 1;
    resizeState.startScale = state.adjustments[key].scale;
    els.adjustHighlight.classList.add('dragging');
  });
});

// Bound to window rather than the canvas so a drag/resize keeps tracking the
// mouse even once the cursor leaves the canvas element — the canvas is
// usually displayed well under its native 1080px size, so a canvas-only
// listener caps how far an element can be dragged/resized in one motion at
// roughly the canvas's on-screen size, well short of the full range the
// numeric fields already allow.
window.addEventListener('mousemove', (evt) => {
  if (resizeState.key) {
    const { x, y } = getCanvasCoords(evt);
    const dist = Math.hypot(x - resizeState.centerX, y - resizeState.centerY);
    recordAdjustmentChange();
    const scale = Math.max(5, Math.min(1000, Math.round(resizeState.startScale * (dist / resizeState.startDist))));
    state.adjustments[resizeState.key].scale = scale;
    render();
    applyResizeSnapAndGuides(resizeState.key, resizeState.corner);
    syncAdjustmentInputs(resizeState.key);
    updateAdjustHighlight(resizeState.key);
    return;
  }
  if (!dragState.key) return;
  const { x, y } = getCanvasCoords(evt);
  recordAdjustmentChange();
  const dx = Math.round(dragState.startDx + (x - dragState.startX));
  const dy = Math.round(dragState.startDy + (y - dragState.startY));
  state.adjustments[dragState.key].dx = dx;
  state.adjustments[dragState.key].dy = dy;
  render();
  applyCenterSnapAndGuides(dragState.key);
  syncAdjustmentInputs(dragState.key);
  updateAdjustHighlight(dragState.key);
});

window.addEventListener('mouseup', () => {
  if (dragState.key) {
    commitAdjustmentUndoGroup();
    els.adjustHighlight.classList.remove('dragging');
    dragState.key = null;
    hideCenterGuides();
  }
  if (resizeState.key) {
    commitAdjustmentUndoGroup();
    els.adjustHighlight.classList.remove('dragging');
    resizeState.key = null;
    hideCenterGuides();
  }
});

// Bound to #canvasWrap (not the canvas element) so moving from the canvas
// onto one of the resize handles — a sibling element stacked on top of the
// canvas — doesn't itself count as "left the interactive area" and hide the
// highlight/handles out from under the cursor.
canvasWrap.addEventListener('mouseleave', () => {
  if (!dragState.key && !resizeState.key) {
    els.adjustHighlight.style.display = 'none';
    canvas.classList.remove('adjust-hoverable');
  }
});

[els.title, els.dateStart, els.dateEnd, els.dateOverride, els.venue, els.mainCopy, els.subCopy, els.copyright, els.extraText, els.priceField, els.saleTag]
  .forEach(el => el.addEventListener('input', render));

// Keep the "still untranslated?" chip badges live while typing, not just
// when switching languages — these are the three fields scanTranslationGaps()
// (and scanStaleTranslations()) actually check. Editing one of these fields
// while viewing a non-source language also counts as "I've just confirmed
// this translation matches today's source text", so it records a snapshot —
// otherwise a hand-written (not auto-translated) translation would never get
// one, and a later source edit could never be detected as making it stale.
[['title', els.title], ['mainCopy', els.mainCopy], ['subCopy', els.subCopy], ['saleTag', els.saleTag]].forEach(([fieldName, el]) => {
  el.addEventListener('input', () => {
    if (state.currentLang !== getSourceLang()) {
      const sourceLang = getSourceLang();
      const sourceText = (state.drafts[sourceLang] && state.drafts[sourceLang][fieldName]) || '';
      recordTranslationSnapshot(state.currentLang, fieldName, sourceText);
    }
    renderLangBar();
  });
});

els.bannerPurposeSelect.addEventListener('change', () => {
  state.bannerPurpose = els.bannerPurposeSelect.value;
  applyBannerPurposeUI();
  render();
});

els.titleFontSelect.addEventListener('change', () => {
  state.titleFont = els.titleFontSelect.value;
  render();
});

els.titleNoWrapToggle.addEventListener('change', () => {
  state.titleNoWrap = els.titleNoWrapToggle.checked;
  render();
});
els.mainCopyNoWrapToggle.addEventListener('change', () => {
  state.mainCopyNoWrap = els.mainCopyNoWrapToggle.checked;
  render();
});

// Canvas fillText() silently substitutes the next font in the stack if the
// requested webfont hasn't actually been downloaded yet — unlike real DOM
// text, drawing to a <canvas> never itself triggers the browser to fetch a
// font. The <link> tag in <head> only registers what's *available*, so
// without this, switching to a preset nobody has "used" elsewhere on the
// page would silently render in the fallback font, found by checking
// document.fonts.check() after Oswald/Noto Sans JP (used from day one, so
// already fetched) came back true but every newer preset font came back
// false. Force-load every webfont referenced by TITLE_FONT_PRESETS up front
// (both the Latin display face AND its CJK pair — an earlier version of
// this only loaded the first family per preset, which happened to work for
// 3 of 5 presets purely because they reuse the already-loaded Noto Sans JP
// as their second family, and silently left Shippori Mincho/M PLUS Rounded
// 1c never fetched), and re-render once each one actually lands in case
// render() already ran against the fallback.
['Oswald', 'Noto Sans JP', 'Playfair Display', 'Shippori Mincho', 'Fredoka', 'M PLUS Rounded 1c', 'Orbitron', 'Inter']
  .forEach(family => {
    document.fonts.load(`700 100px "${family}"`).then(() => render()).catch(() => {});
  });

// ---------- Pre-export preview ----------
// A last-look check before any of the 3 export actions (PNG / レイヤー別ZIP /
// PSD) actually run. Shows every 言語×会期 combination as a thumbnail grid —
// not just whatever's currently on screen — reusing the exact same
// iterateBatchVariants() generator the 一括生成プレビュー grid runs on, so
// "check all languages and all sessions" works here too. When no 案件マスタ
// sessions have been parsed (getSelectedBatchSessions() returns []), a
// single implicit session ({} — an empty object) stands in for "just use
// whatever venue/dates are currently filled in", so this still works for a
// plain single-venue project with multiple languages, not only after a
// batch paste.
//
// Clicking a thumbnail switches the live editor to that variant AND marks
// it "selected" (not close-on-click like 一括生成プレビュー — the point here
// is choosing what to export next, not just browsing), so the user can
// compare several before deciding. Whichever variant is selected when
// "選択中の内容で書き出す" is pressed is what pendingExportAction actually
// acts on — it always reads the live canvas/state at call time, whether
// that's the original state (nothing clicked) or whatever was last clicked.
let pendingExportAction = null;
let exportPreviewCancelled = false;

async function showExportPreview(actionFn) {
  pendingExportAction = actionFn;
  const parsedSessionsList = getSelectedBatchSessions();
  const iterSessions = parsedSessionsList.length ? parsedSessionsList : [{}];
  const langs = state.languages.slice();
  const total = iterSessions.length * langs.length;

  const prevLang = state.currentLang;
  const prevVenue = els.venue.value;
  const prevDateStart = els.dateStart.value;
  const prevDateEnd = els.dateEnd.value;
  saveCurrentDraft();

  exportPreviewCancelled = false;
  els.exportPreviewGrid.innerHTML = '';
  els.exportPreviewStatus.textContent = total > 1 ? `生成中… 0/${total}` : '';
  els.exportPreviewOverlay.classList.add('open');

  const thumbCanvas = getBatchPreviewThumbCanvas();
  const thumbCtx = thumbCanvas.getContext('2d');
  let done = 0;
  let selectedItem = null;

  for await (const { session, lang } of iterateBatchVariants(iterSessions, langs)) {
    if (exportPreviewCancelled) break;

    thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    thumbCtx.drawImage(canvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE, 0, 0, thumbCanvas.width, thumbCanvas.height);

    const item = document.createElement('div');
    item.className = 'batch-preview-item';
    const img = document.createElement('img');
    img.src = thumbCanvas.toDataURL('image/png');
    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    const cityName = session.city || session.venue || els.venue.value || `会場${done + 1}`;
    labelEl.innerHTML = `${cityName}<br><span class="lang">${LANGUAGE_LABELS[lang] || lang}</span>`;
    item.appendChild(img);
    item.appendChild(labelEl);

    // The variant that was actually showing when the export button was
    // clicked — marked selected by default so "書き出す" does something
    // sensible even if the user never clicks a thumbnail.
    const isOriginal = lang === prevLang && (!parsedSessionsList.length || session.venue === prevVenue);
    if (isOriginal && !selectedItem) {
      item.classList.add('selected');
      selectedItem = item;
    }

    item.addEventListener('click', () => {
      applySession(session);
      switchLang(lang);
      Array.from(els.exportPreviewGrid.children).forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedItem = item;
    });

    els.exportPreviewGrid.appendChild(item);
    done++;
    if (total > 1) els.exportPreviewStatus.textContent = `${done}/${total}`;
  }

  if (total <= 1) {
    els.exportPreviewStatus.textContent = '';
  } else {
    els.exportPreviewStatus.textContent = done < total
      ? `${done}/${total}（中断されました）`
      : `全${total}件を表示中。クリックで書き出す内容を切り替えられます。`;
  }

  // Restore the live editor to whatever it showed before this ran — the
  // "selected" thumbnail above already reflects that same state, so
  // pressing 書き出す right away (without clicking a thumbnail) exports
  // exactly what was on screen when the export button was pressed.
  state.currentLang = prevLang;
  loadDraft(prevLang);
  els.venue.value = prevVenue;
  els.dateStart.value = prevDateStart;
  els.dateEnd.value = prevDateEnd;
  renderLangBar();
  render();
}

function closeExportPreview() {
  exportPreviewCancelled = true;
  els.exportPreviewOverlay.classList.remove('open');
  pendingExportAction = null;
}

els.confirmExportBtn.addEventListener('click', () => {
  const action = pendingExportAction;
  closeExportPreview();
  if (action) action();
});
els.cancelExportBtn.addEventListener('click', closeExportPreview);
els.closeExportPreviewBtn.addEventListener('click', closeExportPreview);
els.exportPreviewOverlay.addEventListener('click', (evt) => {
  if (evt.target === els.exportPreviewOverlay) closeExportPreview();
});
window.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape' && els.exportPreviewOverlay.classList.contains('open')) closeExportPreview();
});

els.download.addEventListener('click', () => {
  showExportPreview(() => {
    if (!confirmProceedWithUntranslated()) return;
    const link = document.createElement('a');
    link.download = 'gaaat-banner.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
});

// ---------- Layer export (レイヤー分け出力) ----------
// `layers` already holds the 4 offscreen layer canvases from the most
// recent render() call (see the layer system near the top of this file) —
// these exports just package them up, they don't re-render anything.

function showLayerExportStatus(text, isError) {
  els.layerExportStatus.style.display = '';
  els.layerExportStatus.classList.toggle('error', !!isError);
  els.layerExportStatus.textContent = text;
}

// Reloading the page resets state.artImage to null (nothing is persisted
// across reloads) — easy to forget after a reload and only notice once the
// exported file is opened in another app, away from the live preview where
// the "アップロードしてください" placeholder would have been visible. Catch
// it here instead.
function confirmProceedWithoutArt() {
  if (state.artImage) return true;
  return confirm('素材がアップロードされていません（ページを再読み込みすると素材の選択はリセットされます）。このまま書き出しますか？');
}

// See findUntranslatedFields() above — warns before a final export if any
// per-language field still looks like an untranslated seed copy.
function confirmProceedWithUntranslated() {
  const warnings = findUntranslatedFields();
  if (!warnings.length) return true;
  return confirm(
    `まだ翻訳されていない、または原文の変更後に訳文が更新されていない可能性がある項目があります:\n\n${warnings.join('\n')}\n\nこのまま書き出しますか？`
  );
}

async function downloadLayersZip() {
  if (!confirmProceedWithoutArt()) return;
  if (!confirmProceedWithUntranslated()) return;
  els.downloadLayersZipBtn.disabled = true;
  showLayerExportStatus('レイヤーPNGを書き出し中…', false);
  try {
    const zip = new JSZip();
    for (const name of LAYER_ORDER) {
      const blob = await new Promise(resolve => layers[name].canvas.toBlob(resolve, 'image/png'));
      zip.file(`${LAYER_LABELS[name]}.png`, blob);
    }
    const flattenedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    zip.file('flattened.png', flattenedBlob);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gaaat-banner-layers.zip';
    a.click();
    URL.revokeObjectURL(url);
    showLayerExportStatus('レイヤー別PNGをZIPでダウンロードしました。', false);
  } catch (err) {
    console.error(err);
    showLayerExportStatus(`書き出しに失敗しました: ${err.message}`, true);
  } finally {
    els.downloadLayersZipBtn.disabled = false;
  }
}

els.downloadLayersZipBtn.addEventListener('click', () => { showExportPreview(() => downloadLayersZip()); });

// ag-psd is ~800KB, so it's only fetched the first time someone actually
// asks for a PSD, not on every page load.
let agPsdLoadPromise = null;
function loadAgPsd() {
  if (window.agPsd) return Promise.resolve();
  if (agPsdLoadPromise) return agPsdLoadPromise;
  agPsdLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/ag-psd@31.0.2/dist/bundle.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('PSD書き出しライブラリの読み込みに失敗しました'));
    document.head.appendChild(script);
  });
  return agPsdLoadPromise;
}

async function downloadPsd() {
  if (!confirmProceedWithoutArt()) return;
  if (!confirmProceedWithUntranslated()) return;
  els.downloadPsdBtn.disabled = true;
  try {
    showLayerExportStatus('PSD書き出しライブラリを読み込み中…', false);
    await loadAgPsd();
    showLayerExportStatus('PSDを生成中…', false);

    const psd = {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      canvas, // composite image, used as the file's Photoshop thumbnail/preview
      // PSD layer records are stored bottom-of-stack first, so this order
      // (same as LAYER_ORDER: background → artwork → decoration → text)
      // reproduces the correct stacking when opened in Photoshop.
      children: LAYER_ORDER.map(name => ({
        name: LAYER_LABELS[name],
        top: 0, left: 0, bottom: CANVAS_SIZE, right: CANVAS_SIZE,
        canvas: layers[name].canvas
      }))
    };
    const buffer = window.agPsd.writePsd(psd);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gaaat-banner.psd';
    a.click();
    URL.revokeObjectURL(url);
    showLayerExportStatus('PSDファイルをダウンロードしました。', false);
  } catch (err) {
    console.error(err);
    showLayerExportStatus(`PSD書き出しに失敗しました: ${err.message}`, true);
  } finally {
    els.downloadPsdBtn.disabled = false;
  }
}

els.downloadPsdBtn.addEventListener('click', () => { showExportPreview(() => downloadPsd()); });

// ---------- Language drafts (per-field, toggleable) ----------
// Copy fields can independently be "言語別" (a separate value per language,
// the default) or shared/unified across all languages — the lang-toggle
// checkboxes in the panel control state.langSpecific per field group.
// Shared fields are simply never touched by save/load, so whatever is typed
// there stays as-is regardless of which language is selected.
//
// dates/venue are NOT here: they're facts pulled straight from 案件マスタ
// (project master) — dates auto-format per language and venue names are
// normally already in their as-printed form, so they're always shared
// across languages, set once via applySession() and left alone by the
// language switcher. title IS here (default per-language): the master's
// 企画タイトル is Japanese text that often needs translating for other
// languages, unlike a date or a venue's proper name.
const LANG_FIELD_GROUPS = {
  title: ['title'],
  mainCopy: ['mainCopy'],
  subCopy: ['subCopy'],
  copyright: ['copyright'],
  extraText: ['extraText'],
  saleTag: ['saleTag']
};

function saveCurrentDraft() {
  if (!state.drafts[state.currentLang]) state.drafts[state.currentLang] = {};
  const d = state.drafts[state.currentLang];
  Object.entries(LANG_FIELD_GROUPS).forEach(([groupKey, fieldNames]) => {
    if (!state.langSpecific[groupKey]) return;
    fieldNames.forEach(fn => { d[fn] = els[fn].value; });
  });
}

function loadDraft(lang) {
  const d = state.drafts[lang];
  Object.entries(LANG_FIELD_GROUPS).forEach(([groupKey, fieldNames]) => {
    if (!state.langSpecific[groupKey]) return; // shared: leave the field as-is
    fieldNames.forEach(fn => {
      if (d && d[fn] !== undefined) els[fn].value = d[fn];
    });
  });
  if (!d) {
    // First time this language is opened: seed it with the current text so
    // there's something to translate from, instead of a blank banner.
    saveCurrentDraft();
  }
}

// Field groups worth checking for "still just the seeded, untranslated
// text" before export. copyright is deliberately excluded — a copyright
// notice is very often meant to stay identical across every language, so
// flagging it would just be noise.
const TRANSLATION_CHECK_GROUPS = ['title', 'mainCopy', 'subCopy', 'saleTag'];
const TRANSLATION_CHECK_LABELS = { title: '展示会タイトル', mainCopy: 'メインコピー', subCopy: 'サブコピー' };

// Per-language fields get seeded with another language's text the first
// time that language is opened, as a starting point to translate from (see
// loadDraft above) — but it's easy to open a language, never actually edit
// the seeded text, and export it as-is with no error or warning. This scans
// every configured language for fields that are still word-for-word
// identical to another language, which is a strong signal that the seed was
// never replaced with a real translation. Shared by findUntranslatedFields()
// (export-time confirm dialog) and renderLangBar() (live chip badges).
// Returns {groupKey, langs}[] for every field group with a gap.
function scanTranslationGaps() {
  if (state.languages.length < 2) return [];
  saveCurrentDraft();
  const gaps = [];
  TRANSLATION_CHECK_GROUPS.forEach(groupKey => {
    if (!state.langSpecific[groupKey]) return; // shared on purpose, not a translation gap
    const fieldName = LANG_FIELD_GROUPS[groupKey][0];
    const byText = new Map();
    state.languages.forEach(lang => {
      const draft = state.drafts[lang];
      const val = (draft && draft[fieldName] !== undefined ? draft[fieldName] : els[fieldName].value).trim();
      if (!val) return;
      if (!byText.has(val)) byText.set(val, []);
      byText.get(val).push(lang);
    });
    byText.forEach(langsWithText => {
      if (langsWithText.length > 1) gaps.push({ groupKey, langs: langsWithText });
    });
  });
  return gaps;
}

function findUntranslatedFields() {
  const untranslated = scanTranslationGaps().map(g => {
    const langLabel = g.langs.map(l => LANGUAGE_LABELS[l] || l).join('・');
    return `${TRANSLATION_CHECK_LABELS[g.groupKey]}（${langLabel}が同じ内容）`;
  });
  const stale = scanStaleTranslations().map(s =>
    `${TRANSLATION_CHECK_LABELS[s.groupKey]}（${LANGUAGE_LABELS[s.lang] || s.lang}が原文の変更前のまま）`
  );
  return untranslated.concat(stale);
}

// The single language every other language's translation is judged against.
// 日本語 (案件マスタの原文) when configured, matching autoTranslateUntranslated's
// existing per-job preference; otherwise whichever language was configured
// first, so a project with no Japanese draft still has a well-defined source.
function getSourceLang() {
  return state.languages.includes('ja') ? 'ja' : state.languages[0];
}

// Records that `lang`'s `fieldName` was just translated/confirmed against
// today's source text — call this both after auto-translating a field and
// after a human hand-edits a translated field, so scanStaleTranslations()
// below has something to compare a later source-language edit against.
function recordTranslationSnapshot(lang, fieldName, sourceText) {
  if (!state.translationSnapshots[lang]) state.translationSnapshots[lang] = {};
  state.translationSnapshots[lang][fieldName] = sourceText;
}

// Finds translations that were correct as of some earlier source text but
// have since gone stale because the source was edited afterward — e.g. the
// 日本語 title gets a wording tweak after English was already translated and
// reviewed. This is deliberately separate from scanTranslationGaps(), which
// only catches text that was NEVER translated (still identical to another
// language) — a real translation that diverges from its now-outdated source
// looks nothing like the source text, so the identical-text check can't see
// it. Only meaningful where a snapshot was actually recorded: no snapshot
// means "never translated/confirmed at all", which is exactly what
// scanTranslationGaps already flags, so this leaves it alone rather than
// reporting the same gap twice under a different label.
function scanStaleTranslations() {
  if (state.languages.length < 2) return [];
  saveCurrentDraft();
  const sourceLang = getSourceLang();
  const stale = [];
  TRANSLATION_CHECK_GROUPS.forEach(groupKey => {
    if (!state.langSpecific[groupKey]) return; // shared on purpose, not a translation
    const fieldName = LANG_FIELD_GROUPS[groupKey][0];
    const sourceDraft = state.drafts[sourceLang];
    const currentSourceText = (sourceDraft && sourceDraft[fieldName] !== undefined ? sourceDraft[fieldName] : els[fieldName].value);
    state.languages.forEach(lang => {
      if (lang === sourceLang) return;
      const snaps = state.translationSnapshots[lang];
      const snapshotText = snaps ? snaps[fieldName] : undefined;
      if (snapshotText === undefined || snapshotText === currentSourceText) return;
      stale.push({ groupKey, lang });
    });
  });
  return stale;
}

// ---------- Auto-translate (MyMemory API) ----------
// Machine-translates whatever scanTranslationGaps() flags as "still
// identical across 2+ languages" — i.e. seeded but never actually edited —
// straight into each language's draft. Purely mechanical (no creative
// copywriting), which is the point: it stops an untranslated seed from ever
// being exported by accident. The output is still machine translation, so
// the UI is explicit that a person should check it afterward.

async function translateLine(text, targetCode, sourceCode) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sourceCode)}|${encodeURIComponent(targetCode)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`MyMemory API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data.responseStatus && Number(data.responseStatus) !== 200) {
    throw new Error(`MyMemory: ${data.responseDetails || data.responseStatus}`);
  }
  if (!data.responseData || typeof data.responseData.translatedText !== 'string') {
    throw new Error('MyMemory: 想定外のレスポンス形式でした。');
  }
  return data.responseData.translatedText;
}

// MyMemory's free endpoint translates one string per request (no batching
// like a paid API might offer), so each non-blank line gets its own call —
// blank lines are left blank so a multi-line title's line breaks survive.
// A short pause between requests is polite to the free, shared service.
async function translateLines(lines, targetCode, sourceCode) {
  const out = lines.slice();
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    out[i] = await translateLine(lines[i], targetCode, sourceCode);
    await new Promise(r => setTimeout(r, 150));
  }
  return out;
}

async function translateFieldText(text, targetLang, sourceLang) {
  const translatedLines = await translateLines(text.split('\n'), translateLangCode(targetLang), translateLangCode(sourceLang));
  return translatedLines.join('\n');
}

async function autoTranslateUntranslated() {
  const gaps = scanTranslationGaps();
  const stale = scanStaleTranslations();
  if (!gaps.length && !stale.length) {
    els.autoTranslateStatus.style.display = '';
    els.autoTranslateStatus.classList.remove('error');
    els.autoTranslateStatus.textContent = '未翻訳・要更新の項目は見つかりませんでした。';
    return;
  }

  els.autoTranslateBtn.disabled = true;
  els.autoTranslateStatus.style.display = '';
  els.autoTranslateStatus.classList.remove('error');

  // Flatten to individual (field, source lang → target lang) jobs — never-
  // translated gaps and now-stale (source since edited) translations both
  // become the same kind of job, since "translate this field's current
  // source text into this language" is the fix for both. Within a gap's
  // duplicate-text group, 日本語 is preferred as the source when present
  // (the 案件マスタ is always Japanese); otherwise whichever language in the
  // group was configured first. Stale jobs always use getSourceLang(),
  // since that's what scanStaleTranslations() judged them stale against.
  const jobs = [];
  gaps.forEach(gap => {
    const fieldName = LANG_FIELD_GROUPS[gap.groupKey][0];
    const sourceLang = gap.langs.includes('ja') ? 'ja' : gap.langs[0];
    gap.langs.filter(l => l !== sourceLang).forEach(targetLang => {
      jobs.push({ groupKey: gap.groupKey, fieldName, sourceLang, targetLang });
    });
  });
  stale.forEach(s => {
    const fieldName = LANG_FIELD_GROUPS[s.groupKey][0];
    jobs.push({ groupKey: s.groupKey, fieldName, sourceLang: getSourceLang(), targetLang: s.lang });
  });

  let done = 0;
  try {
    for (const job of jobs) {
      done++;
      els.autoTranslateStatus.textContent = `翻訳中… ${TRANSLATION_CHECK_LABELS[job.groupKey]} → ${LANGUAGE_LABELS[job.targetLang] || job.targetLang} (${done}/${jobs.length})`;
      const sourceText = (state.drafts[job.sourceLang] && state.drafts[job.sourceLang][job.fieldName]) || '';
      if (!sourceText.trim()) continue;
      const translated = await translateFieldText(sourceText, job.targetLang, job.sourceLang);
      if (!state.drafts[job.targetLang]) state.drafts[job.targetLang] = {};
      state.drafts[job.targetLang][job.fieldName] = translated;
      // Snapshot against getSourceLang()'s text specifically (not
      // necessarily job.sourceLang — they usually match, but job.sourceLang
      // is picked per duplicate-text group and can differ in edge cases)
      // so a later edit to the project's actual source language is what
      // scanStaleTranslations() compares against, consistently.
      const sourceLang = getSourceLang();
      const canonicalSourceText = (state.drafts[sourceLang] && state.drafts[sourceLang][job.fieldName]) || sourceText;
      recordTranslationSnapshot(job.targetLang, job.fieldName, canonicalSourceText);
    }
    loadDraft(state.currentLang);
    render();
    renderLangBar();
    els.autoTranslateStatus.textContent = `自動翻訳が完了しました（${jobs.length}件）。機械翻訳なので、内容を必ず確認してください。`;
  } catch (err) {
    console.error(err);
    els.autoTranslateStatus.classList.add('error');
    els.autoTranslateStatus.textContent = `翻訳に失敗しました: ${err.message}`;
  } finally {
    els.autoTranslateBtn.disabled = false;
  }
}

els.autoTranslateBtn.addEventListener('click', autoTranslateUntranslated);

// Turning a field group's toggle ON makes it per-language going forward.
// Seed every existing language's draft with the field's current (shared)
// value first, so nothing goes blank on the next language switch — but
// only where that language doesn't already have its own saved value, so
// re-enabling doesn't clobber earlier per-language edits.
function onLangSpecificToggle(groupKey, checked) {
  state.langSpecific[groupKey] = checked;
  if (!checked) return;
  const fieldNames = LANG_FIELD_GROUPS[groupKey];
  state.languages.forEach(lang => {
    if (!state.drafts[lang]) state.drafts[lang] = {};
    fieldNames.forEach(fn => {
      if (state.drafts[lang][fn] === undefined) {
        state.drafts[lang][fn] = els[fn].value;
      }
    });
  });
}

Object.keys(LANG_FIELD_GROUPS).forEach(groupKey => {
  const el = els[`langToggle_${groupKey}`];
  if (el) el.addEventListener('change', () => onLangSpecificToggle(groupKey, el.checked));
});

function renderLangBar() {
  els.langBar.innerHTML = '';
  const gaps = scanTranslationGaps();
  const stale = scanStaleTranslations();
  const untranslatedLangs = new Set();
  gaps.forEach(g => g.langs.forEach(l => untranslatedLangs.add(l)));
  const staleLangs = new Set(stale.map(s => s.lang));

  state.languages.forEach(lang => {
    const chip = document.createElement('button');
    chip.type = 'button';
    const isUntranslated = untranslatedLangs.has(lang);
    const isStale = staleLangs.has(lang);
    chip.className = 'lang-chip'
      + (lang === state.currentLang ? ' active' : '')
      + (isUntranslated || isStale ? ' needs-translation' : '');
    chip.textContent = LANGUAGE_LABELS[lang] || lang;
    if (isUntranslated && isStale) {
      chip.title = 'まだ翻訳されていない項目と、原文の変更後に更新されていない項目があります';
    } else if (isStale) {
      chip.title = '原文が変更された後、この言語の翻訳が更新されていない項目があります';
    } else if (isUntranslated) {
      chip.title = 'まだ翻訳されていない可能性がある項目があります';
    }
    chip.addEventListener('click', () => switchLang(lang));
    els.langBar.appendChild(chip);
  });

  if (els.batchLangSummary) {
    els.batchLangSummary.textContent = state.languages.map(l => LANGUAGE_LABELS[l] || l).join('、');
  }

  if (els.translationWarningHint) {
    const untranslatedWarnings = gaps.map(g => {
      const langLabel = g.langs.map(l => LANGUAGE_LABELS[l] || l).join('・');
      return `${TRANSLATION_CHECK_LABELS[g.groupKey]}（${langLabel}が同じ内容）`;
    });
    const staleWarnings = stale.map(s =>
      `${TRANSLATION_CHECK_LABELS[s.groupKey]}（${LANGUAGE_LABELS[s.lang] || s.lang}が原文の変更前のまま）`
    );
    const allWarnings = untranslatedWarnings.concat(staleWarnings);
    els.translationWarningHint.style.display = allWarnings.length ? '' : 'none';
    els.translationWarningHint.textContent = allWarnings.length
      ? `未翻訳・要更新の可能性: ${allWarnings.join(' / ')}`
      : '';
  }

  if (els.autoTranslateBtn) {
    const hasWork = gaps.length || stale.length;
    els.autoTranslateBtn.style.display = hasWork ? '' : 'none';
    if (!hasWork) {
      els.autoTranslateStatus.style.display = 'none';
    }
  }

  renderAddLangSelect();
}

// Populates the "+ 追加" dropdown with every predefined language not
// already in use. Replaces an earlier prompt()-based flow, which is
// unreliable in a number of embedded/webview browser contexts.
function renderAddLangSelect() {
  const candidates = Object.keys(LANGUAGE_LABELS).filter(l => !state.languages.includes(l));
  els.addLangSelect.innerHTML = '';
  candidates.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = LANGUAGE_LABELS[l];
    els.addLangSelect.appendChild(opt);
  });
  const otherOpt = document.createElement('option');
  otherOpt.value = '__other__';
  otherOpt.textContent = 'その他（コード入力）';
  els.addLangSelect.appendChild(otherOpt);

  const hasCandidates = candidates.length > 0;
  els.addLangSelect.style.display = hasCandidates ? '' : 'none';
  els.addLangBtn.style.display = '';
  if (!hasCandidates) els.addLangSelect.value = '__other__';
}

function switchLang(lang) {
  if (lang === state.currentLang) return;
  saveCurrentDraft();
  state.currentLang = lang;
  loadDraft(lang);
  renderLangBar();
  render();
}

function addLanguage() {
  const picked = els.addLangSelect.value;
  let lang;
  if (picked === '__other__' || !picked) {
    lang = (prompt('追加する言語コードを入力してください（例: ko）') || '').trim();
  } else {
    lang = picked;
  }
  if (!lang || state.languages.includes(lang)) return;
  if (!LANGUAGE_LABELS[lang]) LANGUAGE_LABELS[lang] = lang;
  if (!LANGUAGE_LOCALES[lang]) LANGUAGE_LOCALES[lang] = lang;
  state.languages.push(lang);
  switchLang(lang);
}

els.addLangBtn.addEventListener('click', addLanguage);

// ---------- Paste import (案件マスタ) ----------
// The master sheet isn't a flat table — each project tab has a "案件基本情報"
// block (title/copyright, once) followed by one repeating "会期/巡回情報"
// block per city (PJコード, dates, venue...). We parse whatever range the
// user copied by scanning cells for known Japanese labels, rather than
// assuming fixed column positions — that survives merged cells and lets
// people paste one city's block or the whole tab.

const BASIC_INFO_LABELS = { title: '企画タイトル', copyright: 'コピーライト' };
const SESSION_LABELS = {
  pjCode: 'PJコード', order: '開催順序', city: '開催都市',
  venue: '会場名', dateStart: '開始日', dateEnd: '終了日'
};

function findValueInRow(cells, label) {
  const idx = cells.findIndex(c => c.trim() === label);
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

function parsePastedGrid(text) {
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

let parsedSessions = [];

function applySession(session) {
  if (!session) return;
  if (session.venue) els.venue.value = session.venue;
  if (session.dateStart) els.dateStart.value = toIsoDate(session.dateStart);
  if (session.dateEnd) els.dateEnd.value = toIsoDate(session.dateEnd);
  render();
}

// Includes the raw date range and venue name (not just city/PJコード) so the
// checklist doubles as a visual sanity-check of what each batch item will
// actually render before hitting generate.
function sessionLabel(s, i) {
  const head = [s.order, s.city, s.pjCode].filter(Boolean).join(' ') || `会場 ${i + 1}`;
  const dateRange = [s.dateStart, s.dateEnd].filter(Boolean).join('〜');
  const details = [dateRange, s.venue].filter(Boolean).join(' / ');
  return details ? `${head}（${details}）` : head;
}

function renderSessionChecklist(sessions) {
  els.sessionChecklist.innerHTML = '';
  if (sessions.length > 1) {
    sessions.forEach((s, i) => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = String(i);
      cb.checked = true;
      const span = document.createElement('span');
      span.textContent = sessionLabel(s, i);
      label.appendChild(cb);
      label.appendChild(span);
      els.sessionChecklist.appendChild(label);
    });
    els.sessionChecklist.style.display = '';
  } else {
    els.sessionChecklist.style.display = 'none';
  }

  const showBatch = sessions.length >= 1;
  els.previewBatchBtn.style.display = showBatch ? '' : 'none';
  els.batchGenerateBtn.style.display = showBatch ? '' : 'none';
  els.batchHint.style.display = showBatch ? '' : 'none';
  els.batchStatus.style.display = 'none';
}

// Parses a TSV/grid-shaped 案件マスタ text block, applies it to the form
// fields, and populates the venue dropdown + batch checklist. Shared by the
// manual paste button and the Google Sheets auto-fetch below, so both paths
// stay in sync and only the status message display differs.
function applyParsedMasterText(text) {
  const { basic, sessions } = parsePastedGrid(text);
  parsedSessions = sessions;

  if (basic.copyright) els.copyright.value = basic.copyright;
  if (basic.title) els.title.value = basic.title;

  els.venueSelect.innerHTML = '';
  if (sessions.length > 1) {
    sessions.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = sessionLabel(s, i);
      els.venueSelect.appendChild(opt);
    });
    els.venueSelect.style.display = '';
  } else {
    els.venueSelect.style.display = 'none';
  }
  if (sessions.length) applySession(sessions[0]);
  renderSessionChecklist(sessions);
  render();

  return sessions.length
    ? `${sessions.length}件の会期情報を見つけました。${sessions.length > 1 ? '会場を選んで切り替えられます。下のチェックリストで一括生成する都市も選べます。' : ''}`
    : '会期情報が見つかりませんでした（企画タイトル/コピーライトのみ反映しました）。';
}

els.parsePasteBtn.addEventListener('click', () => {
  const text = els.pasteArea.value;
  if (!text.trim()) {
    els.pasteStatus.textContent = '貼り付け内容が空です。';
    els.pasteStatus.classList.add('error');
    return;
  }
  const message = applyParsedMasterText(text);
  els.pasteStatus.classList.remove('error');
  els.pasteStatus.textContent = message;
});

els.venueSelect.addEventListener('change', () => {
  applySession(parsedSessions[Number(els.venueSelect.value)]);
});

// ---------- Batch generation (都市 × 言語) ----------
// Renders every checked city × every configured language combination with
// the current template/artwork/colors held fixed, and bundles the PNGs into
// a ZIP (via JSZip, loaded from CDN) so a single click produces the whole
// set of banners for a multi-city, multi-language campaign.

function sanitizeFilename(s) {
  return (s || '').replace(/[\\/:*?"<>|]/g, '_').trim();
}

function getSelectedBatchSessions() {
  const checked = Array.from(els.sessionChecklist.querySelectorAll('input[type=checkbox]:checked'))
    .map(cb => parsedSessions[Number(cb.value)])
    .filter(Boolean);
  // No checklist shown means 0 or 1 parsed session — just use whatever we have.
  return checked.length ? checked : parsedSessions;
}

// Shared by the actual batch-generate loop below and the pre-flight
// thumbnail preview — both need to render every (session, language)
// combination in the same order and the same way, only differing in what
// they do with the canvas after each one. Yields once per variant, right
// after render() plus a paint frame, so the caller can safely read the
// canvas (toBlob/toDataURL/etc.) before the next variant overwrites it.
async function* iterateBatchVariants(sessions, langs) {
  for (const session of sessions) {
    // venue/dates are shared facts (not per-language drafts), so they're set
    // once per session here and simply carry through every language pass.
    if (session.venue) els.venue.value = session.venue;
    if (session.dateStart) els.dateStart.value = toIsoDate(session.dateStart);
    if (session.dateEnd) els.dateEnd.value = toIsoDate(session.dateEnd);

    for (const lang of langs) {
      state.currentLang = lang;
      loadDraft(lang);
      render();
      // Give the canvas a frame to actually paint before reading it back.
      await new Promise(r => requestAnimationFrame(r));
      yield { session, lang };
    }
  }
}

async function runBatchGenerate() {
  if (!state.artImage) {
    els.batchStatus.classList.add('error');
    els.batchStatus.style.display = '';
    els.batchStatus.textContent = '素材をアップロードしてから実行してください。';
    return;
  }
  const sessions = getSelectedBatchSessions();
  if (!sessions.length) {
    els.batchStatus.classList.add('error');
    els.batchStatus.style.display = '';
    els.batchStatus.textContent = '生成する都市が選択されていません。';
    return;
  }
  if (!confirmProceedWithUntranslated()) return;
  const langs = state.languages.slice();
  const hasZip = typeof JSZip !== 'undefined';
  const zip = hasZip ? new JSZip() : null;

  // Snapshot what the panel currently shows, so we can restore it once the
  // batch finishes rather than leaving the UI on the last city/language.
  const prevLang = state.currentLang;
  const prevVenue = els.venue.value;
  const prevDateStart = els.dateStart.value;
  const prevDateEnd = els.dateEnd.value;
  saveCurrentDraft();

  els.batchGenerateBtn.disabled = true;
  els.batchStatus.classList.remove('error');
  els.batchStatus.style.display = '';

  const total = sessions.length * langs.length;
  let done = 0;
  const usedNames = new Set();

  for await (const { session, lang } of iterateBatchVariants(sessions, langs)) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const cityLabel = sanitizeFilename(session.city || session.venue || session.pjCode) || `city${done}`;
    let filename = `${cityLabel}_${lang}.png`;
    let n = 2;
    while (usedNames.has(filename)) { filename = `${cityLabel}_${lang}_${n++}.png`; }
    usedNames.add(filename);

    if (zip) {
      zip.file(filename, blob);
    } else {
      // No JSZip available (e.g. offline) — fall back to individual
      // downloads, spaced out so the browser doesn't treat them as a
      // popup flood and block them.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await new Promise(r => setTimeout(r, 350));
    }

    done++;
    els.batchStatus.textContent = `生成中… ${done}/${total}（${filename}）`;
  }

  if (zip) {
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `gaaat-banners_${stamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Restore the panel to what it showed before the batch ran.
  state.currentLang = prevLang;
  loadDraft(prevLang);
  els.venue.value = prevVenue;
  els.dateStart.value = prevDateStart;
  els.dateEnd.value = prevDateEnd;
  renderLangBar();
  render();

  els.batchGenerateBtn.disabled = false;
  els.batchStatus.textContent = `完了：${total}件のバナーを${zip ? 'ZIPでダウンロードしました' : '個別にダウンロードしました'}。`;
}

els.batchGenerateBtn.addEventListener('click', () => {
  runBatchGenerate().catch(err => {
    console.error(err);
    els.batchGenerateBtn.disabled = false;
    els.batchStatus.classList.add('error');
    els.batchStatus.style.display = '';
    els.batchStatus.textContent = `エラーが発生しました: ${err.message || err}`;
  });
});

// ---------- Batch preview (一括生成前のサムネイル一覧) ----------
// Runs the exact same (session × language) render loop as runBatchGenerate
// (via the shared iterateBatchVariants generator) but, instead of encoding
// full PNGs into a ZIP, downscales each render into a small thumbnail and
// shows them all in a grid — so a mistake that only shows up for one
// particular city/language (a long venue name overflowing, a missed
// translation, ...) can be caught by eye before committing to the real
// generate-and-download step. Deliberately skips the untranslated-text
// confirm() that runBatchGenerate shows — seeing the untranslated text in
// the thumbnails IS the point here, not something to gate on.
let batchPreviewThumbCanvas = null;
function getBatchPreviewThumbCanvas() {
  if (!batchPreviewThumbCanvas) {
    batchPreviewThumbCanvas = document.createElement('canvas');
    batchPreviewThumbCanvas.width = 240;
    batchPreviewThumbCanvas.height = 240;
  }
  return batchPreviewThumbCanvas;
}

// True while a showBatchPreview() render loop is in flight — lets
// close/Escape/backdrop-click stop it from rendering further variants
// nobody can see anymore, and lets a thumbnail click skip the loop's
// end-of-run restore so jumping to that variant isn't immediately undone.
let batchPreviewCancelled = false;
let batchPreviewNavigatedAway = false;

function closeBatchPreview() {
  batchPreviewCancelled = true;
  els.batchPreviewOverlay.classList.remove('open');
}

async function showBatchPreview() {
  if (!state.artImage) {
    alert('素材をアップロードしてから実行してください。');
    return;
  }
  const sessions = getSelectedBatchSessions();
  if (!sessions.length) {
    alert('生成する都市が選択されていません。');
    return;
  }
  const langs = state.languages.slice();
  const total = sessions.length * langs.length;

  // Same snapshot/restore dance as runBatchGenerate — this is a read-only
  // look, so the editor should come back exactly as it was, not left on
  // whichever city/language happened to render last.
  const prevLang = state.currentLang;
  const prevVenue = els.venue.value;
  const prevDateStart = els.dateStart.value;
  const prevDateEnd = els.dateEnd.value;
  saveCurrentDraft();

  batchPreviewCancelled = false;
  batchPreviewNavigatedAway = false;
  els.previewBatchBtn.disabled = true;
  els.batchPreviewGrid.innerHTML = '';
  els.batchPreviewStatus.textContent = `生成中… 0/${total}`;
  els.batchPreviewOverlay.classList.add('open');

  const thumbCanvas = getBatchPreviewThumbCanvas();
  const thumbCtx = thumbCanvas.getContext('2d');
  let done = 0;

  for await (const { session, lang } of iterateBatchVariants(sessions, langs)) {
    if (batchPreviewCancelled) break;

    thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    thumbCtx.drawImage(canvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE, 0, 0, thumbCanvas.width, thumbCanvas.height);

    const item = document.createElement('div');
    item.className = 'batch-preview-item';
    const img = document.createElement('img');
    img.src = thumbCanvas.toDataURL('image/png');
    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    const cityName = session.city || session.venue || session.pjCode || `会場${done + 1}`;
    labelEl.innerHTML = `${cityName}<br><span class="lang">${LANGUAGE_LABELS[lang] || lang}</span>`;
    item.appendChild(img);
    item.appendChild(labelEl);
    item.addEventListener('click', () => {
      batchPreviewNavigatedAway = true;
      applySession(session);
      switchLang(lang);
      closeBatchPreview();
    });
    els.batchPreviewGrid.appendChild(item);

    done++;
    els.batchPreviewStatus.textContent = `${done}/${total}`;
  }

  els.previewBatchBtn.disabled = false;
  if (!done) els.batchPreviewStatus.textContent = '';
  else if (done < total) els.batchPreviewStatus.textContent = `${done}/${total}（中断されました）`;
  else els.batchPreviewStatus.textContent = `${total}件のプレビューを生成しました。クリックするとその都市・言語に切り替わります。`;

  if (!batchPreviewNavigatedAway) {
    state.currentLang = prevLang;
    loadDraft(prevLang);
    els.venue.value = prevVenue;
    els.dateStart.value = prevDateStart;
    els.dateEnd.value = prevDateEnd;
    renderLangBar();
    render();
  }
}

els.previewBatchBtn.addEventListener('click', () => {
  showBatchPreview().catch(err => {
    console.error(err);
    els.previewBatchBtn.disabled = false;
    closeBatchPreview();
    alert(`プレビュー生成中にエラーが発生しました: ${err.message || err}`);
  });
});
els.closeBatchPreviewBtn.addEventListener('click', closeBatchPreview);
els.batchPreviewOverlay.addEventListener('click', (evt) => {
  if (evt.target === els.batchPreviewOverlay) closeBatchPreview();
});
window.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape' && els.batchPreviewOverlay.classList.contains('open')) closeBatchPreview();
});

// ---------- Google Drive import ----------
// Lets the user pick a shared Drive folder and load a character art image
// straight from it, instead of uploading a file by hand. Uses Google
// Identity Services (GIS) for OAuth (token flow) and calls the Drive API v3
// REST endpoints directly via fetch — no gapi client library needed.
//
// SETUP REQUIRED before this works: GOOGLE_CLIENT_ID below must be replaced
// with a real OAuth 2.0 "Web application" Client ID from Google Cloud
// Console (APIs & Services → Credentials), with the Google Drive API AND
// Google Sheets API both enabled on that same project, and this app's origin
// added under "Authorized JavaScript origins". Full steps are in
// docs/layout-templates.md. Until then the UI shows a setup notice instead
// of a broken sign-in button.
const GOOGLE_CLIENT_ID = '595263181261-86c5uct9ojm2tteir113gb2qlg9rvrod.apps.googleusercontent.com';
// One login covers both Drive (character art) and Sheets (案件マスタ) access.
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly';

function isGoogleConfigured() {
  return !!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_OAUTH_CLIENT_ID');
}

// 自動翻訳 uses MyMemory (https://mymemory.translated.net/doc/spec.php) — a
// free community translation API with no signup, no API key, and no billing
// account required, callable directly from the browser (CORS-friendly).
// Trade-off vs. a paid engine: quality is more variable and there's a soft
// daily quota (~5,000 words/day anonymous), which is generously enough for
// this tool's per-project titles/copy. No setup step needed — it just works.

let googleTokenClient = null;
let authRequestTimer = null;

// Sign-in appears twice in the UI (素材選定 欄, for Drive folder
// access, and 案件マスタから貼り付け 欄, for Sheets access) — same underlying
// OAuth token client and account state either way, just two entry points so
// whichever section the user starts from has its own button rather than
// sending them to the other one. signInBtns/setupNotes below always update
// together; lastAuthStatusEl tracks which button's own status line should
// show the "opening login…" / "popup blocked" messages for the in-flight
// request, since the token client's callback is shared and doesn't
// otherwise know which button triggered it.
const signInBtns = () => [els.driveSignInBtn, els.sheetsSignInBtn];
const setupNotes = () => [els.driveSetupNote, els.sheetsSetupNote];
let lastAuthStatusEl = null;

function initGoogleAuthUI(attempt) {
  attempt = attempt || 0;
  if (!isGoogleConfigured()) {
    const msg = 'Googleドライブ連携は未設定です。Google Cloud ConsoleでOAuthクライアントIDを発行し、app.js の GOOGLE_CLIENT_ID に設定すると使えます（手順はdocs/layout-templates.mdを参照）。';
    setupNotes().forEach(el => { el.textContent = msg; });
    signInBtns().forEach(btn => { btn.disabled = true; });
    return;
  }
  if (typeof google === 'undefined' || !google.accounts) {
    // The GIS script tag (https://accounts.google.com/gsi/client) is async
    // and may not have finished loading yet — but if it's blocked entirely
    // (firewall, ad-blocker, offline), it never will, so give up after ~15s
    // instead of leaving the button disabled forever with no explanation.
    if (attempt >= 50) {
      const msg = 'Google連携の読み込みに失敗しました。ブラウザの拡張機能（広告ブロッカー等）やネットワーク（ファイアウォール・プロキシ）が accounts.google.com への通信をブロックしていないか確認し、ページを再読み込みしてください。';
      setupNotes().forEach(el => { el.textContent = msg; });
      signInBtns().forEach(btn => { btn.disabled = true; });
      return;
    }
    setupNotes().forEach(el => { el.textContent = 'Google連携を読み込み中…'; });
    signInBtns().forEach(btn => { btn.disabled = true; });
    setTimeout(() => initGoogleAuthUI(attempt + 1), 300);
    return;
  }
  setupNotes().forEach(el => { el.textContent = ''; });
  signInBtns().forEach(btn => { btn.disabled = false; });
  googleTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: resp => {
      clearTimeout(authRequestTimer);
      if (resp.error) {
        const statusEl = lastAuthStatusEl || els.driveStatus;
        statusEl.classList.add('error');
        statusEl.style.display = '';
        statusEl.textContent = `ログインに失敗しました: ${resp.error}`;
        return;
      }
      state.googleAccessToken = resp.access_token;
      els.driveStatus.style.display = 'none';
      els.sheetsAuthStatus.style.display = 'none';
      signInBtns().forEach(btn => {
        btn.textContent = 'Googleにログイン済み（ドライブ・スプレッドシート）';
        btn.disabled = true;
      });
      els.driveFolderRow.style.display = '';
    }
  });
}

function requestGoogleSignIn(statusEl) {
  if (!googleTokenClient) return;
  lastAuthStatusEl = statusEl;
  statusEl.classList.remove('error');
  statusEl.style.display = '';
  statusEl.textContent = 'Googleのログイン画面を開いています…';
  // The GIS popup opens silently with no callback if the browser blocks it —
  // without this timeout, a blocked popup looks exactly like a dead button.
  clearTimeout(authRequestTimer);
  authRequestTimer = setTimeout(() => {
    statusEl.classList.add('error');
    statusEl.textContent = 'ログイン画面が開けませんでした。ブラウザがポップアップをブロックしている可能性があります。アドレスバー付近のポップアップブロック通知を確認し、このサイトのポップアップを許可してから、もう一度ボタンを押してください。';
  }, 4000);
  googleTokenClient.requestAccessToken();
}

els.driveSignInBtn.addEventListener('click', () => requestGoogleSignIn(els.driveStatus));
els.sheetsSignInBtn.addEventListener('click', () => requestGoogleSignIn(els.sheetsAuthStatus));

// Accepts either a full folder URL (.../folders/{id}, or ?id={id}) or a raw
// folder ID pasted directly.
function extractDriveFolderId(input) {
  const s = input.trim();
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
  return null;
}

async function googleApiFetch(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${state.googleAccessToken}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

// Highlights files whose name contains a parsed session's PJコード or
// 開催都市, so the right art is easy to spot among many files in a shared
// folder — a lightweight stand-in for a real PJコード↔ファイル mapping.
function matchesParsedSession(filename) {
  const lower = filename.toLowerCase();
  return parsedSessions.some(s =>
    (s.pjCode && lower.includes(s.pjCode.toLowerCase())) ||
    (s.city && lower.includes(s.city.toLowerCase()))
  );
}

function renderDriveFileGrid(files) {
  els.driveFileGrid.innerHTML = '';
  files.forEach(file => {
    const isMatch = matchesParsedSession(file.name);
    const item = document.createElement('div');
    item.className = 'drive-file-item' + (isMatch ? ' match' : '');
    item.title = file.name;

    if (file.thumbnailLink) {
      const img = document.createElement('img');
      img.src = file.thumbnailLink;
      img.alt = file.name;
      img.onerror = () => img.remove();
      item.appendChild(img);
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = file.name;
    item.appendChild(nameEl);

    if (isMatch) {
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = '候補';
      item.appendChild(badge);
    }

    item.addEventListener('click', () => selectDriveFile(file));
    els.driveFileGrid.appendChild(item);
  });
  els.driveFileGrid.style.display = 'grid';
}

async function loadDriveFolder(folderId) {
  els.driveStatus.classList.remove('error');
  els.driveStatus.style.display = '';
  els.driveStatus.textContent = 'フォルダを読み込み中…';
  els.driveFileGrid.style.display = 'none';
  els.driveFileGrid.innerHTML = '';

  const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,thumbnailLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100`;

  try {
    const res = await googleApiFetch(url);
    const data = await res.json();
    const files = data.files || [];
    if (!files.length) {
      els.driveStatus.textContent = 'このフォルダに画像ファイルが見つかりませんでした（共有設定もご確認ください）。';
      return;
    }
    els.driveStatus.textContent = `${files.length}件の画像が見つかりました。使う画像をクリックしてください。`;
    renderDriveFileGrid(files);
  } catch (err) {
    console.error(err);
    els.driveStatus.classList.add('error');
    els.driveStatus.textContent = `読み込みに失敗しました: ${err.message}`;
  }
}

els.driveLoadFolderBtn.addEventListener('click', () => {
  const folderId = extractDriveFolderId(els.driveFolderInput.value);
  if (!folderId) {
    els.driveStatus.classList.add('error');
    els.driveStatus.style.display = '';
    els.driveStatus.textContent = 'フォルダのURLまたはIDを正しく入力してください。';
    return;
  }
  loadDriveFolder(folderId);
});

// Downloads the selected file's bytes and feeds them into the exact same
// pipeline as a manual file upload (extractPalette → colors → auto
// template → render), so Drive-sourced art behaves identically everywhere.
async function selectDriveFile(file) {
  els.driveStatus.classList.remove('error');
  els.driveStatus.style.display = '';
  els.driveStatus.textContent = `${file.name} を読み込み中…`;
  try {
    const res = await googleApiFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });
    state.artImage = img;
    const palette = extractPalette(img);
    state.colors.bg = palette.bg;
    state.colors.accent = palette.accent;
    state.colors.accentRaw = palette.accentRaw;
    state.textOverride = null;
    syncColorPickers();
    maybeAutoSelectTemplate();
    render();
    els.driveStatus.textContent = `${file.name} を読み込みました。`;
  } catch (err) {
    console.error(err);
    els.driveStatus.classList.add('error');
    els.driveStatus.textContent = `読み込みに失敗しました: ${err.message}`;
  }
}

// ---------- Google Sheets import (案件マスタの自動取得) ----------
// Reuses the same Google login as the Drive art picker above (one token,
// two scopes) and the exact same parsing/apply logic as the manual paste
// button (applyParsedMasterText) — this just fetches the cells for you
// instead of requiring copy/paste.

// Accepts a full spreadsheet URL (…/spreadsheets/d/{id}/…#gid={gid}) and
// pulls out the spreadsheet ID plus, if present, which tab (gid) it points
// at — pasting a URL with the target 案件 tab already open is how a user
// tells us which tab to read.
function extractSheetsInfo(input) {
  const s = input.trim();
  const idMatch = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) return null;
  const gidMatch = s.match(/[#&]gid=(\d+)/);
  return { spreadsheetId: idMatch[1], gid: gidMatch ? gidMatch[1] : null };
}

async function loadFromSheetsUrl(url) {
  els.sheetsStatus.classList.remove('error');
  els.sheetsStatus.style.display = '';

  const info = extractSheetsInfo(url);
  if (!info) {
    els.sheetsStatus.classList.add('error');
    els.sheetsStatus.textContent = 'スプレッドシートのURLを正しく入力してください。';
    return;
  }

  try {
    els.sheetsStatus.textContent = 'シート情報を確認中…';
    const metaRes = await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}?fields=sheets.properties`
    );
    const meta = await metaRes.json();
    const sheetsList = meta.sheets || [];
    if (!sheetsList.length) throw new Error('シートが見つかりませんでした。');

    let sheetProps = sheetsList[0].properties;
    if (info.gid !== null) {
      const match = sheetsList.find(s => String(s.properties.sheetId) === info.gid);
      if (match) sheetProps = match.properties;
    }

    els.sheetsStatus.textContent = `「${sheetProps.title}」タブを読み込み中…`;
    const range = encodeURIComponent(`'${sheetProps.title}'!A1:Z300`);
    const valuesRes = await googleApiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${range}`
    );
    const valuesData = await valuesRes.json();
    const rows = valuesData.values || [];
    if (!rows.length) {
      els.sheetsStatus.textContent = `「${sheetProps.title}」タブにデータが見つかりませんでした。`;
      return;
    }

    // Reuse the exact same TSV-based parser the manual paste box uses, so
    // both entry points stay in sync with a single source of truth.
    const text = rows.map(row => row.join('\t')).join('\n');
    const message = applyParsedMasterText(text);
    els.sheetsStatus.textContent = `「${sheetProps.title}」タブから読み込みました。${message}`;
  } catch (err) {
    console.error(err);
    els.sheetsStatus.classList.add('error');
    els.sheetsStatus.textContent = `読み込みに失敗しました: ${err.message}`;
  }
}

els.loadSheetsBtn.addEventListener('click', () => {
  if (!state.googleAccessToken) {
    els.sheetsStatus.classList.add('error');
    els.sheetsStatus.style.display = '';
    els.sheetsStatus.textContent = '先に上の「Googleでログイン」を済ませてください。';
    return;
  }
  loadFromSheetsUrl(els.sheetsUrlInput.value);
});

// ---------- Init ----------

const logoImg = new Image();
logoImg.onload = () => { state.logoImage = logoImg; render(); };
logoImg.src = LOGO_DATA_URL;

syncColorPickers();
applyBannerPurposeUI();
initGoogleAuthUI();
renderLangBar();
render();

// Canvas text only picks up a webfont once the browser has actually
// finished loading it — a <link> tag alone doesn't make Canvas wait, so the
// very first paint above may briefly fall back to the system font. Re-render
// once the title webfonts are ready (or after a timeout if the network
// blocks fonts.gstatic.com, matching the FONT_STACK fallback either way).
Promise.race([
  Promise.all([
    document.fonts.load('700 100px "Oswald"'),
    document.fonts.load('700 100px "Noto Sans JP"'),
    document.fonts.load('900 100px "Noto Sans JP"')
  ]),
  new Promise(resolve => setTimeout(resolve, 3000))
]).then(render).catch(() => {});
