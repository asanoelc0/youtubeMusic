# YouTube Music プレイリスト並び替えツール

YouTube Music アプリのドラッグ&ドロップによる曲順変更が使いづらいため、
**Excel やテキストエディタでプレイリストの曲順を編集し、そのままYouTube Musicに反映する**ためのツールです。

YouTube Music で作成したプレイリストは YouTube 本体のプレイリストと同じデータなので、
公式の **YouTube Data API v3** を使って安全に読み書きします（非公式APIやCookie認証は使いません）。

## できること

### A. PC上でExcel/テキストエディタを使う方法

1. プレイリストの中身を CSV / xlsx に書き出す（`export_playlist.py`）
2. Excel やテキストエディタで**行を並び替えて保存する**
3. 保存したファイルを読み込み、その行の順番どおりに YouTube Music 側の曲順を更新する（`import_playlist.py`）

### B. スマホのブラウザで並び替える方法（Webアプリ）

ローカルで動く小さなWebアプリ（`app.py`）を起動し、同じWi-Fiに繋がったスマホのブラウザから
アクセスして、曲を指(タッチ)でドラッグ&ドロップして並び替え、保存ボタンでそのままYouTube Musicに反映できます。

## 制約

- 自分で作成した通常のプレイリストのみ対応します。「お気に入りの曲」や自動生成される Supermix などの
  YouTube Music 固有の自動プレイリストは YouTube Data API v3 の対象外のため扱えません。
- 曲順の更新には1曲あたり50ユニットのAPIクォータを消費します（デフォルト上限: 1日10,000ユニット ≒ 約200件の更新まで無料）。

## セットアップ

### 1. Google Cloud で認証情報を取得する

1. [Google Cloud Console](https://console.cloud.google.com/) で新しいプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」から **YouTube Data API v3** を有効化
3. 「APIとサービス」→「OAuth同意画面」を設定
   - User Type: 外部（個人利用なら「テスト」ステータスのままでOK）
   - テストユーザーに自分の Google アカウントを追加
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
   - アプリケーションの種類: **デスクトップアプリ**
   - 作成後に表示されるJSONをダウンロードし、`client_secret.json` という名前でこのプロジェクトのルートに置く

### 2. Python環境の準備

```bash
python -m venv venv
source venv/bin/activate  # Windowsは venv\Scripts\activate
pip install -r requirements.txt
```

## 使い方

### 1. プレイリストIDを確認する

```bash
python list_playlists.py
```

自分のプレイリスト一覧とIDが表示されます。初回実行時はブラウザが開き、Googleアカウントでの認証を求められます
（認証情報は `token.json` に保存され、次回以降は自動的に使われます）。

### 2. プレイリストを書き出す

```bash
python export_playlist.py <playlist_id> playlist.xlsx
```

CSVで出力したい場合は拡張子を `.csv` にしてください。

出力されるファイルの列:

| 列 | 内容 |
|---|---|
| order | 元々の並び順(参考用、編集時は無視してOK) |
| title | 曲名 |
| channel | チャンネル名(アーティスト) |
| videoId | 動画ID |
| playlistItemId | プレイリスト内アイテムのID(削除・変更しないこと) |

### 3. 並び替える

Excel やテキストエディタで**行そのものを並び替えて**保存してください。
`order` 列の数値を書き換える必要はありません。ファイル内の行の並び順がそのまま新しい曲順になります。
`videoId` と `playlistItemId` の列は消さないでください。

### 4. YouTube Musicに反映する

まず `--dry-run` で変更内容を確認するのがおすすめです。

```bash
python import_playlist.py <playlist_id> playlist.xlsx --dry-run
```

問題なければ本実行します。

```bash
python import_playlist.py <playlist_id> playlist.xlsx
```

## スマホのブラウザから並び替える（Webアプリ）

PC（サーバーとして動かす端末）で以下を実行します。

```bash
python app.py
```

1. **初回のみ**、起動した**そのPC自身のブラウザ**で `http://localhost:5000` を開いてください。
   Googleの認証画面が表示されるので、ログインして許可します（`token.json` に保存され、以降は不要）。
2. PCのLAN内IPアドレスを確認します。
   - Windows: `ipconfig` の「IPv4アドレス」
   - Mac/Linux: `ifconfig` または `ip addr` の `192.168.x.x` / `10.x.x.x` のようなアドレス
3. スマホを**同じWi-Fi**に接続し、ブラウザで `http://<PCのIPアドレス>:5000` を開きます（例: `http://192.168.1.10:5000`）。
4. 上部のプルダウンでプレイリストを選択すると曲一覧が表示されます。
   各行の **☰** を指で押しながらドラッグして並び替え、下部の「この並び順を保存」を押すとYouTube Musicに反映されます。

### 注意

- このWebアプリは認証機能を持たないため、**同じネットワーク上の人なら誰でもアクセスできてしまいます**。
  自宅などの信頼できるネットワークでのみ起動してください。使い終わったら `Ctrl+C` でサーバーを停止することをおすすめします。
- 外出先からアクセスしたい場合（インターネット経由での公開）は追加のセキュリティ対策が必要なため、
  このツールの対象外としています。
