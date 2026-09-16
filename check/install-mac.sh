#!/bin/bash
# GAAAT 入稿チェック — Illustrator のスクリプトメニューに登録する
#
#   sudo bash check/install-mac.sh
#
# Illustrator のスクリプトフォルダはアプリ本体の中にあり、管理者権限がないと
# 書き込めない。登録しておくと「ファイル → スクリプト → GAAAT入稿チェック」で
# 直接呼べるようになり、毎回「その他のスクリプト...」からファイルを探す操作が消える。
#
# 常に公開中の最新版を取りに行くので、手元に古い preflight.jsx が残っていても
# 関係ない（古い版を使い続ける事故が実際に起きたため、ここは意図的にこうしている）。

set -u

URL="https://akinoritsuguchi.github.io/gaaat-banner-tool/check/preflight.jsx"
NAME="GAAAT入稿チェック.jsx"

if [ "$(id -u)" -ne 0 ]; then
  echo "管理者権限が必要です。次のように実行してください:"
  echo "  sudo bash check/install-mac.sh"
  exit 1
fi

TMP="$(mktemp -t gaaat-preflight)" || exit 1
trap 'rm -f "$TMP"' EXIT

echo "最新のスクリプトを取得しています..."
if ! curl -fsSL "$URL" -o "$TMP"; then
  echo "取得できませんでした。ネットワーク接続を確認してください。"
  exit 1
fi

# 取れたものが本物か軽く確かめる（プロキシのエラーページを掴むことがある）
if ! grep -q "gaaat-preflight" "$TMP"; then
  echo "取得したファイルが入稿チェックのスクリプトではないようです。中止します。"
  exit 1
fi

FOUND=0
while IFS= read -r DIR; do
  [ -d "$DIR" ] || continue
  if cp "$TMP" "$DIR/$NAME"; then
    chmod 644 "$DIR/$NAME"
    echo "  登録: $DIR/$NAME"
    FOUND=$((FOUND + 1))
  fi
done < <(find /Applications -maxdepth 4 -type d \( -name "スクリプト" -o -name "Scripts" \) -path "*Illustrator*" 2>/dev/null)

if [ "$FOUND" -eq 0 ]; then
  echo "Illustrator のスクリプトフォルダが見つかりませんでした。"
  echo "Illustrator がインストールされているか確認してください。"
  exit 1
fi

echo ""
echo "完了しました（$FOUND 箇所）。"
echo "Illustrator を再起動すると、ファイル → スクリプト → GAAAT入稿チェック が出ます。"
