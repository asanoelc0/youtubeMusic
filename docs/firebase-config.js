// Firebaseコンソール → プロジェクトの設定 → 全般 → マイアプリ(ウェブアプリを追加)
// で表示される値に置き換えてください。
// これらの値はクライアント側で公開されることを前提とした識別子であり、秘密情報ではありません
// (アクセス制御はFirebase Authenticationの承認済みドメインとGoogle Cloudの同意画面設定で行います)。
const firebaseConfig = {
  apiKey: "AIzaSyB2WG48QqUeJOUkJDTW8VaiTaelDOBfnmQ",
  authDomain: "conaole-9f8a0.firebaseapp.com",
  projectId: "conaole-9f8a0",
  storageBucket: "conaole-9f8a0.firebasestorage.app",
  messagingSenderId: "1019106450954",
  appId: "1:1019106450954:web:4632ba8cf0b6f8ac7bc9f3",
};

// YouTube APIのアクセストークン取得用(Google Identity Services)。
// Google Cloud Console → APIとサービス → 認証情報 に、Firebaseが自動作成した
// 「ウェブクライアント」の値(...apps.googleusercontent.com)を貼り付けてください。
// https://console.cloud.google.com/apis/credentials?project=conaole-9f8a0
const GOOGLE_CLIENT_ID = "1019106450954-la09qfpri8sklmtl8upahejolrlgtcug.apps.googleusercontent.com";
