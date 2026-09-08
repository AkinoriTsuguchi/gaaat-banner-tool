/* GAAAT 共通：Googleログイン（GIS）・Sheets / Drive アクセス
 *
 * バナーツール・リーフレットツールと同じOAuthクライアントIDを使う。
 * 3ツールを同一オリジンに置いているのはこのためで、別リポジトリにすると
 * Google Cloud 側の「承認済みJavaScript生成元」を足す作業が増える。
 *
 * UIには依存しない。呼び出し側は init() にコールバックを渡し、
 * ボタンやステータス行の見た目は各ツールが自分で持つ。
 */
(function (global) {
  const GAAAT = global.GAAAT || (global.GAAAT = {});

  const CLIENT_ID = '595263181261-86c5uct9ojm2tteir113gb2qlg9rvrod.apps.googleusercontent.com';
  // 1回のログインで Drive（素材）と Sheets（案件マスタ）の両方をまかなう。
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly';

  let tokenClient = null;
  let accessToken = null;
  let requestTimer = null;
  let handlers = {};

  function isConfigured() {
    return !!CLIENT_ID && !CLIENT_ID.startsWith('YOUR_GOOGLE_OAUTH_CLIENT_ID');
  }
  function getToken() { return accessToken; }

  /**
   * handlers: { onSetupMessage(msg), onReady(), onSignedIn(), onSignedOut(), onError(msg) }
   * GISのスクリプトは async 読み込みなので、来るまで少しだけ待つ。
   * ブロックされている場合（拡張機能・プロキシ）は永久に来ないので、
   * 約15秒で諦めて理由を出す。ボタンが無言で無効なままだと原因が分からないため。
   */
  function init(opts, attempt) {
    handlers = opts || handlers;
    attempt = attempt || 0;
    if (!isConfigured()) {
      handlers.onSetupMessage && handlers.onSetupMessage(
        'Google連携は未設定です。shared/google.js の CLIENT_ID にOAuthクライアントIDを設定すると使えます。');
      return;
    }
    if (typeof google === 'undefined' || !google.accounts) {
      if (attempt >= 50) {
        handlers.onSetupMessage && handlers.onSetupMessage(
          'Google連携の読み込みに失敗しました。ブラウザの拡張機能（広告ブロッカー等）やネットワークが accounts.google.com への通信をブロックしていないか確認し、ページを再読み込みしてください。');
        return;
      }
      handlers.onSetupMessage && handlers.onSetupMessage('Google連携を読み込み中…');
      setTimeout(() => init(handlers, attempt + 1), 300);
      return;
    }
    handlers.onSetupMessage && handlers.onSetupMessage('');
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: resp => {
        clearTimeout(requestTimer);
        if (resp.error) {
          handlers.onError && handlers.onError(`ログインに失敗しました: ${resp.error}`);
          return;
        }
        accessToken = resp.access_token;
        handlers.onSignedIn && handlers.onSignedIn();
      }
    });
    handlers.onReady && handlers.onReady();
  }

  // GISのポップアップはブロックされると無言で開かないだけなので、
  // タイムアウトで「ポップアップがブロックされている」と言えるようにする。
  function requestSignIn(onStatus) {
    if (!tokenClient) return;
    onStatus && onStatus('Googleのログイン画面を開いています…', false);
    clearTimeout(requestTimer);
    requestTimer = setTimeout(() => {
      onStatus && onStatus('ログイン画面が開けませんでした。ブラウザがポップアップをブロックしている可能性があります。このサイトのポップアップを許可してから、もう一度ボタンを押してください。', true);
    }, 4000);
    tokenClient.requestAccessToken();
  }

  // アクセストークンは1時間ほどで失効する。401を受けたらトークンを捨てて
  // ログインボタンを押せる状態に戻す（失敗した操作の自動リトライはしない）。
  async function apiFetch(url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 401) {
      accessToken = null;
      handlers.onSignedOut && handlers.onSignedOut();
      throw new Error('Googleのログインが期限切れになりました。もう一度ログインしてから実行してください。');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Google API error ${res.status}: ${body.slice(0, 200)}`);
    }
    return res;
  }

  // URL（.../folders/{id} か ?id={id}）でも、生のIDでも受ける。
  function extractDriveFolderId(input) {
    const s = (input || '').trim();
    const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
    return null;
  }

  async function listImageFiles(folderId) {
    const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`);
    const fields = encodeURIComponent('files(id,name,mimeType,thumbnailLink)');
    const res = await apiFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200`);
    const data = await res.json();
    return data.files || [];
  }

  // Drive の画像を <img> にして返す。data URL を経由するのは、
  // 後段で canvas に描いた際に tainted 扱いにならないようにするため
  // （地色の読み取りと書き出しの両方が blob URL だと失敗しうる）。
  async function loadDriveImage(fileId) {
    const res = await apiFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
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
    return img;
  }

  // シートURL（#gid= 付きなら対象タブ）を読み、TSV相当のテキストにして返す。
  // 貼り付け欄と同じパーサーを通すため、あえて文字列に落としている。
  // range は既定のままだと A1:Z300。入稿チェックの価格照合は列も行も足りないので、
  // 呼び出し側から広げられるようにしてある（既定値は変えていないので既存2ツールは無影響）。
  async function fetchSheetText(spreadsheetId, gid, range) {
    const metaRes = await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`);
    const meta = await metaRes.json();
    const sheetsList = meta.sheets || [];
    if (!sheetsList.length) throw new Error('シートが見つかりませんでした。');

    let props = sheetsList[0].properties;
    if (gid !== null && gid !== undefined) {
      const match = sheetsList.find(s => String(s.properties.sheetId) === String(gid));
      if (match) props = match.properties;
    }
    const a1 = range || 'A1:Z300';
    const encodedRange = encodeURIComponent(`'${props.title}'!${a1}`);
    const valuesRes = await apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`);
    const valuesData = await valuesRes.json();
    const rows = valuesData.values || [];
    return { sheetTitle: props.title, text: rows.map(r => r.join('\t')).join('\n') };
  }

  GAAAT.google = {
    CLIENT_ID, SCOPES, isConfigured, init, requestSignIn, apiFetch, getToken,
    extractDriveFolderId, listImageFiles, loadDriveImage, fetchSheetText
  };
})(window);
