/* GAAAT 共通：自動翻訳（MyMemory）と、未翻訳／要更新の検出
 *
 * MyMemory（https://mymemory.translated.net/doc/spec.php）は登録もAPIキーも
 * 課金アカウントも不要で、ブラウザから直接叩ける。有料エンジンに比べて品質は
 * ばらつくが、案件ごとのタイトル・コピー程度の分量なら無料枠で足りる。
 * 訳文は必ず人が確認する前提の「下訳」として使う。
 */
(function (global) {
  const GAAAT = global.GAAAT || (global.GAAAT = {});
  const i18n = GAAAT.i18n;

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

  // 無料エンドポイントは1リクエスト1文字列なので、空行以外を1行ずつ投げる。
  // 空行を残すのは、複数行タイトルの改行位置を訳文でも保つため。
  async function translateLines(lines, targetCode, sourceCode) {
    const out = lines.slice();
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      out[i] = await translateLine(lines[i], targetCode, sourceCode);
      await new Promise(r => setTimeout(r, 150));
    }
    return out;
  }

  async function translateText(text, targetLang, sourceLang) {
    const translated = await translateLines(
      text.split('\n'), i18n.translateLangCode(targetLang), i18n.translateLangCode(sourceLang));
    return translated.join('\n');
  }

  /**
   * 未翻訳の検出：ある項目が「複数の言語でまったく同じ文字列」なら、
   * 原文がコピーされたまま訳されていない疑いが高い、という判定。
   * drafts: { [lang]: { [field]: text } } / fields: 対象の項目名の配列
   */
  function scanGaps(drafts, langs, fields) {
    const gaps = [];
    fields.forEach(field => {
      const byText = new Map();
      langs.forEach(lang => {
        const text = ((drafts[lang] || {})[field] || '').trim();
        if (!text) return;
        if (!byText.has(text)) byText.set(text, []);
        byText.get(text).push(lang);
      });
      byText.forEach((langsWithText) => {
        if (langsWithText.length > 1) gaps.push({ field, langs: langsWithText });
      });
    });
    return gaps;
  }

  /**
   * 要更新の検出：訳した時点の原文（snapshot）と、いまの原文を比べる。
   * 「そもそも未翻訳」は scanGaps が拾うので、ここは
   * 「訳したあとで原文だけ直された」ケース専用。
   * snapshots: { [lang]: { [field]: sourceTextAtTranslationTime } }
   */
  function scanStale(drafts, snapshots, langs, fields, sourceLang) {
    const stale = [];
    langs.forEach(lang => {
      if (lang === sourceLang) return;
      fields.forEach(field => {
        const snap = ((snapshots[lang] || {})[field]);
        if (snap === undefined) return;
        const now = ((drafts[sourceLang] || {})[field] || '').trim();
        if (now && now !== snap) stale.push({ field, lang });
      });
    });
    return stale;
  }

  GAAAT.translate = { translateLine, translateLines, translateText, scanGaps, scanStale };
})(window);
