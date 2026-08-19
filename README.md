# YouTube Music プレイリスト並び替えツール

YouTube Music アプリのドラッグ&ドロップによる曲順変更が使いづらいため、自分で並び替えられるようにするためのツールです。

YouTube Music で作成したプレイリストは YouTube 本体のプレイリストと同じデータなので、
公式の **YouTube Data API v3** を使って安全に読み書きします（非公式APIやCookie認証は使いません）。

## 設定値の早見表(このリポジトリで設定済みのもの)

| 項目 | 値 |
|---|---|
| Google Cloudプロジェクト | `conaole-9f8a0` |
| GitHub Pages公開URL | https://asanoelc0.github.io/youtubeMusic/ |
| OAuthクライアントID(`docs/config.js`の`GOOGLE_CLIENT_ID`) | `1019106450954-la09qfpri8sklmtl8upahejolrlgtcug.apps.googleusercontent.com` |
| 承認済みJavaScript生成元 | `https://asanoelc0.github.io` |
| OAuth同意画面の公開ステータス | テスト中(Testing) |

よく使う設定画面へのリンク:

- YouTube Data API v3 有効化状況: https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=conaole-9f8a0
- OAuth同意画面(テストユーザーの追加・確認): https://console.cloud.google.com/apis/credentials/consent?project=conaole-9f8a0
- OAuthクライアントID(承認済みJavaScript生成元の確認・変更): https://console.cloud.google.com/apis/credentials?project=conaole-9f8a0
- GitHub Pages設定: https://github.com/asanoelc0/youtubeMusic/settings/pages

## できること

### A. PC上でExcel/テキストエディタを使う方法

1. プレイリストの中身を CSV / xlsx に書き出す（`export_playlist.py`）
2. Excel やテキストエディタで**行を並び替えて保存する**
3. 保存したファイルを読み込み、その行の順番どおりに YouTube Music 側の曲順を更新する（`import_playlist.py`）

### B. スマホでいつでも並び替える方法（Webアプリ、サーバー不要）

`docs/` 以下は**サーバーを必要としない静的なWebアプリ**です。GitHub Pagesで公開し、Google Identity Services
経由でGoogleにログインすると、ブラウザのJavaScriptから直接YouTube Data API v3を呼び出します。

- 常時稼働させるサーバー（PCやクラウド）が不要
- GitHub Pagesは自動でHTTPS配信されるため、外出先のスマホからでもURLを開くだけでアクセス可能
- PWA対応のため、ホーム画面に追加してアプリのように起動できる
- 曲を指(タッチ)でドラッグ&ドロップして並び替え、保存ボタンでそのままYouTube Musicに反映

## 制約

- 自分で作成した通常のプレイリストのみ対応します。「お気に入りの曲」や自動生成される Supermix などの
  YouTube Music 固有の自動プレイリストは YouTube Data API v3 の対象外のため扱えません。
- 曲順の更新には1曲あたり50ユニットのAPIクォータを消費します（デフォルト上限: 1日10,000ユニット ≒ 約200件の更新まで無料）。
- Webアプリ版はブラウザで取得したGoogleのアクセストークンをその場で使う方式のため、トークンは
  **1時間程度で失効**します。失効したら「ログアウト」→「Googleでログイン」で再取得してください
  （ページを開き直すたびに毎回ログインし直す必要があります）。

---

## A. PC上でExcel/テキストエディタを使う方法

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

### 3. プレイリストIDを確認する

```bash
python list_playlists.py
```

自分のプレイリスト一覧とIDが表示されます。初回実行時はブラウザが開き、Googleアカウントでの認証を求められます
（認証情報は `token.json` に保存され、次回以降は自動的に使われます）。

### 4. プレイリストを書き出す

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

### 5. 並び替える

Excel やテキストエディタで**行そのものを並び替えて**保存してください。
`order` 列の数値を書き換える必要はありません。ファイル内の行の並び順がそのまま新しい曲順になります。
`videoId` と `playlistItemId` の列は消さないでください。

### 6. YouTube Musicに反映する

まず `--dry-run` で変更内容を確認するのがおすすめです。

```bash
python import_playlist.py <playlist_id> playlist.xlsx --dry-run
```

問題なければ本実行します。

```bash
python import_playlist.py <playlist_id> playlist.xlsx
```

---

## B. スマホでいつでも並び替える方法（Webアプリ、サーバー不要）

このアプリのログインは **Google Identity Services**（Googleが公式に提供する、ブラウザのJavaScriptから
直接使える認証ライブラリ）のみで行います。FirebaseのGoogleログインでアクセストークンを取り出す方式も
試しましたが、モバイルブラウザ（Safari系のストレージ制限）で認証結果の受け渡しに失敗するケースが
複数確認されたため、より安定するGoogle Identity Servicesに一本化しています。

### 1. Google Cloudプロジェクトの準備

1. [Google Cloud Console](https://console.cloud.google.com/) で新しいプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」から **YouTube Data API v3** を有効化
3. 「APIとサービス」→「OAuth同意画面」
   - User Type: 外部（個人利用なら「テスト」ステータスのままでOK）
   - アプリ名・サポートメールなどの基本情報を入力
   - 「スコープ」のステップで **「スコープを追加または削除」** をクリックし、検索欄に `youtube` と入力、
     もしくは手動で `https://www.googleapis.com/auth/youtube` を貼り付けてチェックを入れ、更新する
     - このスコープは「制限付きスコープ」として警告が出ますが、テストモードで自分のアカウントのみが
       使う分には問題ありません（一般公開する場合のみGoogleの審査が必要になります）
   - 「テストユーザー」のステップで、YouTube Musicを操作したい**自分のGoogleアカウント**を追加する
     （ここに登録したアカウント以外はログインしてもYouTube APIの許可画面でエラーになります）

### 2. OAuthクライアントIDを作成し`config.js`に設定する

1. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
2. アプリケーションの種類: **ウェブアプリケーション**
3. 「承認済みの JavaScript 生成元」に、GitHub PagesのURL（例: `https://asanoelc0.github.io`。
   末尾の `/youtubeMusic/` などのパスは不要、ドメイン部分だけ）を追加
4. 作成すると表示される**クライアントID**(`〜.apps.googleusercontent.com`の文字列)をコピーし、
   このリポジトリの `docs/config.js` の `GOOGLE_CLIENT_ID` に貼り付ける
   （この値は公開されることを前提としたものなので、コミットして問題ありません）

### 3. GitHub Pagesを有効化する

1. このリポジトリの Settings → Pages を開く
2. 「Build and deployment」の Source を **Deploy from a branch** にする
3. Branch を `main`（マージ後）または現在の作業ブランチ、フォルダを **`/docs`** に設定して保存
4. 数分後、`https://<GitHubユーザー名>.github.io/<リポジトリ名>/` でアクセスできるようになります

### 4. 使う

1. スマホ・PC問わず、上記のGitHub PagesのURLをブラウザで開く
2. 「Googleでログイン」をタップし、自分のGoogleアカウントでログイン
   （本人確認とYouTubeへのアクセス許可を1回のポップアップで行います。ブラウザにポップアップブロックの
   通知が出た場合は許可してください）
3. プルダウンでプレイリストを選択すると曲一覧が表示される
4. 各行の **☰** をドラッグして並び替え、下部の「この並び順を保存」でYouTube Musicに反映

### 別のGoogleアカウントを追加したい場合

OAuthクライアントIDやGitHub Pagesなど、ここまでの設定は**プロジェクト全体で1回だけ**でよく、
アカウントを追加するたびにやり直す必要はありません。必要なのは以下の1ステップだけです。

1. https://console.cloud.google.com/apis/credentials/consent?project=conaole-9f8a0 を開く
2. 「テストユーザー」の項目で「+ ADD USERS」をクリックし、追加したいGoogleアカウントのメールアドレスを入力して保存

現在は公開ステータスが「テスト中」のため、ここに登録したGoogleアカウント（最大100件）だけがログインできます。
登録していないアカウントでログインしようとすると、以前見た「Googleの審査プロセスを完了していません」という
エラーになります。

### PWAとして使う

HTTPSで配信されるため、PWA機能がフルに使えます。

- **iPhone(Safari)**: 共有ボタン →「ホーム画面に追加」
- **Android(Chrome)**: メニュー(⋮) →「アプリをインストール」または「ホーム画面に追加」

追加したアイコンから起動すると、ブラウザのアドレスバーなどが無いアプリのような画面で開きます。
