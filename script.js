// ============================================================
// スタンバイ時計
//  - 1秒ごとに時刻と日付を更新する
//  - 画面が自動で消えないようにする（Screen Wake Lock）
//  - 画面タップで 自動 → 昼 → 夜 を切り替える（選んだモードは保存）
// ============================================================

(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    h1: $("h1"), h2: $("h2"),
    m1: $("m1"), m2: $("m2"),
    s1: $("s1"), s2: $("s2"),
    date: $("date"),
    clock: $("clock"),
    toast: $("toast"),
  };

  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
  const pad = (n) => String(n).padStart(2, "0");

  // 変わった文字だけ書き換える
  const set = (node, value) => {
    if (node.textContent !== value) node.textContent = value;
  };

  // ---------- 時計 ----------
  function render() {
    const now = new Date();
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    set(el.h1, hh[0]); set(el.h2, hh[1]);
    set(el.m1, mm[0]); set(el.m2, mm[1]);
    set(el.s1, ss[0]); set(el.s2, ss[1]);
    set(
      el.date,
      `${now.getMonth() + 1}月${now.getDate()}日 ${WEEK[now.getDay()]}曜日`
    );

    // 次の「ちょうど0ミリ秒」に合わせて呼び直す（秒のズレを防ぐ）
    setTimeout(render, 1000 - now.getMilliseconds() + 5);
  }

  // ---------- 画面を消さない ----------
  let wakeLock = null;

  async function keepAwake() {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) {
      // 低電力モードなどで拒否されることがある。次のタップで再試行する。
      wakeLock = null;
    }
  }

  // アプリを開き直したときにかけ直す（裏に回ると自動で解除されるため）
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !wakeLock) keepAwake();
  });

  // ---------- 昼／夜モード ----------
  // auto  : 端末のダークモード設定に合わせる
  // day   : 常に白
  // night : 常に赤
  const MODES = ["auto", "day", "night"];
  const LABEL = { auto: "自動（端末の設定）", day: "昼モード", night: "夜モード" };
  const KEY = "standby-clock-mode";

  const loadMode = () => {
    try { return localStorage.getItem(KEY) || "auto"; } catch { return "auto"; }
  };
  const saveMode = (m) => {
    try { localStorage.setItem(KEY, m); } catch { /* 保存できなくても動作は続ける */ }
  };

  function applyMode(mode) {
    if (mode === "auto") delete document.documentElement.dataset.mode;
    else document.documentElement.dataset.mode = mode;
  }

  let toastTimer;
  function showToast(text) {
    el.toast.textContent = text;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1400);
  }

  let mode = loadMode();
  applyMode(mode);

  el.clock.addEventListener("click", () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    applyMode(mode);
    saveMode(mode);
    showToast(LABEL[mode]);
    if (!wakeLock) keepAwake(); // iOS はタップ操作の中でないと許可されない場合がある
  });

  // ---------- 開始 ----------
  render();
  keepAwake();
})();
