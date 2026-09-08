/* GAAAT 共通：言語定義と、会期・日付の言語別整形
 *
 * 会期は「全言語共通の1つの日付データ」を持ち、表示形式だけ言語で変換する。
 * 訳し忘れで会期がズレる事故が起きないようにするため（バナーツールと同じ方針）。
 * app.js の formatBannerDate() を、ポスター向けに「曜日」と「月日」を
 * 分けて返せるよう拡張したもの。
 */
(function (global) {
  const GAAAT = global.GAAAT || (global.GAAAT = {});

  const LANGUAGE_LABELS = {
    ja: '日本語', en: 'English', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文',
    fr: 'Français', ar: 'العربية', es: 'Español', pt: 'Português',
    de: 'Deutsch', it: 'Italiano'
  };
  const LANGUAGE_LOCALES = {
    ja: 'ja-JP', en: 'en-US', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW',
    fr: 'fr-FR', ar: 'ar-SA', es: 'es-ES', pt: 'pt-PT', de: 'de-DE', it: 'it-IT'
  };
  // 右から左に組む言語。会期の「開始 → 終了」の並びを反転させる必要がある。
  const RTL_LANGS = new Set(['ar']);

  // Cloud Translation は地域なしのコードを取るが、中国語だけは
  // 簡体／繁体の区別が地域コードにしか無いので例外扱いする。
  function translateLangCode(appLangCode) {
    if (appLangCode === 'zh-Hans') return 'zh-CN';
    if (appLangCode === 'zh-Hant') return 'zh-TW';
    return appLangCode.split('-')[0];
  }

  function isRtl(lang) { return RTL_LANGS.has(lang); }

  /**
   * "YYYY-MM-DD" を、ポスターの会期表記に必要な部品へ分解する。
   * 参照ポスター（キャプテン翼NY）が「Fri. 7.17」のように
   * 曜日を小さく・日付を大きく組んでいるので、描画側で級数を変えられるよう
   * weekday と md を分けて返す。
   */
  function dateParts(isoDate, lang) {
    if (!isoDate) return null;
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    const locale = LANGUAGE_LOCALES[lang] || 'en-US';
    let weekday = '';
    try {
      weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date);
    } catch (e) {
      weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date);
    }
    const cjk = lang === 'ja' || lang === 'zh-Hans' || lang === 'zh-Hant';
    // 曜日の略記に終止符を打つのは欧文の習慣。和文・中文・アラビア語で
    // 「金.」と組むと誤植に見えるので、そこだけ落とす。
    const dot = !cjk && !RTL_LANGS.has(lang);
    return { y, m, d, md: `${m}.${d}`, weekday, weekdayShort: weekday + (dot ? '.' : ''), cjk };
  }

  // 1行にまとめた会期文字列。バッジやサブ表記など、級数を分けずに
  // ベタで置きたい場所で使う。
  function formatRange(startIso, endIso, lang) {
    const a = dateParts(startIso, lang);
    const b = dateParts(endIso, lang);
    if (!a && !b) return '';
    const one = p => `${p.weekdayShort} ${p.md}`;
    if (!b) return one(a);
    if (!a) return one(b);
    return isRtl(lang) ? `${one(b)} – ${one(a)}` : `${one(a)} – ${one(b)}`;
  }

  GAAAT.i18n = {
    LANGUAGE_LABELS, LANGUAGE_LOCALES, RTL_LANGS,
    translateLangCode, isRtl, dateParts, formatRange
  };
})(window);
