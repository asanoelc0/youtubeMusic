firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let accessToken = null;
let tokenClient = null;

const loginView = document.getElementById("loginView");
const grantView = document.getElementById("grantView");
const appView = document.getElementById("appView");
const loginBtn = document.getElementById("loginBtn");
const grantBtn = document.getElementById("grantBtn");
const grantLogoutBtn = document.getElementById("grantLogoutBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userLabel = document.getElementById("userLabel");
const grantUserLabel = document.getElementById("grantUserLabel");
const playlistSelect = document.getElementById("playlistSelect");
const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const loginError = document.getElementById("loginError");
const grantError = document.getElementById("grantError");

let sortable = null;
let originalOrder = [];

function setStatus(text) {
  statusEl.textContent = text;
}

// 3つの画面: 未ログイン(loginView) / ログイン済みだがYouTube許可待ち(grantView) / 利用可能(appView)
function renderAuthState() {
  const user = auth.currentUser;

  if (!user) {
    accessToken = null;
    loginView.hidden = false;
    grantView.hidden = true;
    appView.hidden = true;
    return;
  }

  if (!accessToken) {
    loginView.hidden = true;
    grantView.hidden = false;
    appView.hidden = true;
    grantUserLabel.textContent = user.displayName || user.email || "";
    return;
  }

  loginView.hidden = true;
  grantView.hidden = true;
  appView.hidden = false;
  userLabel.textContent = user.displayName || user.email || "";
}

function ensureTokenClient() {
  if (tokenClient || typeof google === "undefined") return tokenClient;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/youtube",
    callback: (tokenResponse) => {
      if (tokenResponse.error) {
        grantError.textContent = `アクセス許可に失敗しました: ${tokenResponse.error}`;
        return;
      }
      grantError.textContent = "";
      accessToken = tokenResponse.access_token;
      renderAuthState();
      loadPlaylists();
    },
    error_callback: (err) => {
      grantError.textContent = `アクセス許可に失敗しました: ${err.type || err.message || err}`;
    },
  });
  return tokenClient;
}

async function ytFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    accessToken = null;
    renderAuthState();
    throw new Error("access token expired");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API エラー (${res.status}): ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

async function fetchAllPages(baseUrl, mapItem) {
  const results = [];
  let pageToken = "";
  do {
    const url = new URL(baseUrl);
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await ytFetch(url);
    (data.items || []).forEach((item) => results.push(mapItem(item)));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return results;
}

function fetchPlaylists() {
  const url = "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true";
  return fetchAllPages(url, (item) => ({
    id: item.id,
    title: item.snippet.title,
    count: item.contentDetails.itemCount,
  }));
}

function fetchPlaylistItems(playlistId) {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}`;
  return fetchAllPages(url, (item) => {
    const snippet = item.snippet;
    return {
      playlistItemId: item.id,
      videoId: item.contentDetails.videoId,
      title: snippet.title,
      channel: snippet.videoOwnerChannelTitle || "",
      thumbnail: snippet.thumbnails && snippet.thumbnails.default ? snippet.thumbnails.default.url : "",
    };
  });
}

async function saveOrder(playlistId, items) {
  const results = [];
  for (let position = 0; position < items.length; position++) {
    const item = items[position];
    const body = {
      id: item.playlistItemId,
      snippet: {
        playlistId,
        position,
        resourceId: { kind: "youtube#video", videoId: item.videoId },
      },
    };
    try {
      await ytFetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      results.push({ playlistItemId: item.playlistItemId, ok: true });
    } catch (err) {
      results.push({ playlistItemId: item.playlistItemId, ok: false, error: String(err) });
    }
  }
  return results;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function currentOrderIds() {
  return [...listEl.querySelectorAll(".item")].map((el) => el.dataset.playlistItemId);
}

function checkDirty() {
  const changed = JSON.stringify(currentOrderIds()) !== JSON.stringify(originalOrder);
  saveBtn.disabled = !changed;
}

function renderItems(items) {
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = '<div class="empty">曲がありません</div>';
    saveBtn.disabled = true;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "item";
    row.dataset.playlistItemId = item.playlistItemId;
    row.dataset.videoId = item.videoId;
    row.innerHTML = `
      <span class="handle">☰</span>
      <img class="thumb" src="${item.thumbnail || ""}" alt="">
      <div class="meta">
        <div class="title">${escapeHtml(item.title)}</div>
        <div class="channel">${escapeHtml(item.channel)}</div>
      </div>
    `;
    listEl.appendChild(row);
  });

  if (sortable) sortable.destroy();
  sortable = new Sortable(listEl, {
    handle: ".handle",
    animation: 150,
    onEnd: checkDirty,
  });

  saveBtn.disabled = true;
}

async function loadPlaylists() {
  setStatus("プレイリストを読み込み中...");
  playlistSelect.innerHTML = '<option value="">プレイリストを選択...</option>';
  try {
    const playlists = await fetchPlaylists();
    playlists.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.title} (${p.count}曲)`;
      playlistSelect.appendChild(opt);
    });
    setStatus(playlists.length ? "プレイリストを選んでください" : "プレイリストが見つかりませんでした");
  } catch (err) {
    setStatus(`読み込みに失敗しました: ${err.message}`);
  }
}

playlistSelect.addEventListener("change", async () => {
  const playlistId = playlistSelect.value;
  if (!playlistId) return;
  setStatus("曲を読み込み中...");
  listEl.innerHTML = "";
  try {
    const items = await fetchPlaylistItems(playlistId);
    originalOrder = items.map((i) => i.playlistItemId);
    renderItems(items);
    setStatus(`${items.length}曲。ハンドル(☰)をドラッグして並び替えできます`);
  } catch (err) {
    setStatus(`読み込みに失敗しました: ${err.message}`);
  }
});

saveBtn.addEventListener("click", async () => {
  const playlistId = playlistSelect.value;
  if (!playlistId) return;
  const rows = [...listEl.querySelectorAll(".item")];
  const items = rows.map((el) => ({
    playlistItemId: el.dataset.playlistItemId,
    videoId: el.dataset.videoId,
  }));

  saveBtn.disabled = true;
  setStatus("保存中... (曲数が多いと時間がかかります)");

  const results = await saveOrder(playlistId, items);
  const failed = results.filter((r) => !r.ok);

  if (failed.length) {
    setStatus(`${failed.length}件の更新に失敗しました。もう一度試してください。`);
    saveBtn.disabled = false;
  } else {
    originalOrder = currentOrderIds();
    setStatus("保存しました");
  }
});

// ステップ1: Firebaseでログイン(本人確認のみ、YouTubeのスコープは要求しない)
loginBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  try {
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    // onAuthStateChangedがrenderAuthState()を呼び、grantViewに遷移する
  } catch (err) {
    loginError.textContent = `ログインに失敗しました: ${err.message}`;
  }
});

// ステップ2: Google Identity Servicesで、YouTube操作用のアクセストークンを取得する
// (ボタンクリックというユーザー操作の中で直接呼び出す必要がある)
grantBtn.addEventListener("click", () => {
  grantError.textContent = "";
  const client = ensureTokenClient();
  if (!client) {
    grantError.textContent = "読み込みに失敗しました。ページを再読み込みしてください。";
    return;
  }
  client.requestAccessToken();
});

grantLogoutBtn.addEventListener("click", () => {
  auth.signOut();
});

logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

auth.onAuthStateChanged(() => {
  renderAuthState();
});

if (window.isSecureContext && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service Worker登録に失敗しました:", err);
    });
  });
}
