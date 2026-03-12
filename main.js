// ==UserScript==
// @name         Auto play in MPV
// @description  Automatically redirect to mpv player when playing online video, with custom right-click menu and auto-play toggle
// @author       lxl66566
// @namespace    https://github.com/lxl66566/auto-play-in-mpv
// @version      0.2.0
// @icon         https://mpv.io/images/mpv-logo-128-0baae5aa.png
// @run-at       document-start
// @license      MIT
// @grant        window.close
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @match        *://*.bilibili.com/*
// @match        *://bilibili.com/*
// @match        *://youtube.com/*
// @match        *://*.youtube.com/*
// ==/UserScript==

(function () {
  "use strict";

  // 要拦截的URL正则模式
  const targetPatterns = [
    /^https?:\/\/(www\.)?bilibili\.com\/video\/.*/,
    /^https?:\/\/live\.bilibili\.com\/.*/,
    /^https?:\/\/(www\.)?bilibili\.com\/bangumi\/play\/.*/,
    /^https?:\/\/(www\.)?youtube\.com\/watch.*/,
    /^https?:\/\/(www\.)?youtube\.com\/playlist.*/,
  ];

  // ======== 1. 用户配置模块 ========
  const AUTO_PLAY_KEY = "mpv_auto_play";
  let isAutoPlay = GM_getValue(AUTO_PLAY_KEY, true);

  // 在油猴菜单中注册开关
  GM_registerMenuCommand(`🔄 切换自动跳转 MPV (当前状态: ${isAutoPlay ? "✅ 已开启" : "❌ 已关闭"})`, () => {
    isAutoPlay = !isAutoPlay;
    GM_setValue(AUTO_PLAY_KEY, isAutoPlay);
    alert(`已${isAutoPlay ? "开启" : "关闭"}自动跳转 MPV 功能。\n(当关闭时，你可以通过右键视频或点击右下角按钮手动打开)`);
    location.reload();
  });

  // ======== 2. 核心通信模块 ========
  let socket = null;
  let isProcessing = false;

  function showToast(message) {
    let toast = document.createElement("div");
    toast.innerText = message;
    toast.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fff; padding: 10px 20px; border-radius: 6px; z-index: 9999999; font-size: 14px; pointer-events: none; opacity: 0; transition: opacity 0.3s;`;
    document.body.appendChild(toast);
    setTimeout(() => (toast.style.opacity = "1"), 10);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function sendToMpv(url, closeAfter = false) {
    if (isProcessing) return;

    socket = new WebSocket("ws://localhost:5777");
    isProcessing = true;

    socket.onopen = function () {
      console.log("auto-play-in-mpv: sending url to socket: ", url);
      socket.send(url);
    };

    socket.onmessage = function (event) {
      console.log("auto-play-in-mpv: received ack");
      socket.close();
      isProcessing = false;
      if (closeAfter) {
        window.close();
      } else {
        showToast("✅ 视频已成功发送至 MPV");
      }
    };

    socket.onerror = function (error) {
      console.error("auto-play-in-mpv: WebSocket error", error);
      isProcessing = false;
      showToast("❌ 无法连接到本地服务端，请确认 Python 脚本已运行");
    };

    socket.onclose = function () {
      isProcessing = false;
    };
  }

  // ======== 3. 悬浮按钮 (当关闭自动播放时展示) ========
  function updateFloatingButton(url, show) {
    let btn = document.getElementById("mpv-floating-btn");
    if (!show) {
      if (btn) btn.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement("div");
      btn.id = "mpv-floating-btn";
      btn.innerHTML = "▶ Play in MPV";
      btn.title = "Play this video in local MPV player";
      btn.style.cssText = `position: fixed; bottom: 30px; right: 30px; background: #00a1d6; color: #fff; padding: 12px 24px; border-radius: 50px; box-shadow: 0 4px 12px rgba(0,161,214,0.4); cursor: pointer; z-index: 999999; font-size: 14px; font-weight: bold; transition: transform 0.2s; user-select: none;`;
      btn.onmouseover = () => (btn.style.transform = "scale(1.05)");
      btn.onmouseout = () => (btn.style.transform = "scale(1)");
      document.body.appendChild(btn);
    }
    btn.onclick = () => sendToMpv(url, false);
  }

  // ======== 4. 页面监听与触发机制 ========
  function trigger() {
    const url = window.location.href;
    const isMatch = targetPatterns.some((regex) => regex.test(url));

    if (isMatch) {
      console.log("auto-play-in-mpv: url matched ->", url);
      if (isAutoPlay) {
        sendToMpv(url, true); // 自动发送并关闭页面
      } else {
        updateFloatingButton(url, true); // 不自动发送，显示悬浮按钮
      }
    } else {
      updateFloatingButton(url, false); // 离开视频页面时移除按钮
    }
  }

  // 适配 SPA 应用(比如B站)的 History API 拦截
  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    window.dispatchEvent(new Event("locationchange"));
  };
  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    window.dispatchEvent(new Event("locationchange"));
  };
  window.addEventListener("popstate", () => window.dispatchEvent(new Event("locationchange")));

  // 初始化时挂载事件
  window.addEventListener("DOMContentLoaded", trigger, false);
  window.addEventListener("locationchange", trigger);

  // ======== 5. 自定义右键菜单模块 ========
  function setupContextMenu() {
    const menu = document.createElement("div");
    menu.id = "mpv-custom-context-menu";
    menu.style.cssText = `position: fixed; background: #282828; border: 1px solid #444; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 9999999; padding: 6px 0; border-radius: 6px; display: none; font-family: sans-serif; font-size: 14px; color: #eee; user-select: none;`;

    // 主选项
    const mpvOption = document.createElement("div");
    mpvOption.innerText = "▶ 在 MPV 中打开此视频";
    mpvOption.style.cssText = `padding: 10px 20px; cursor: pointer; transition: background 0.2s;`;
    mpvOption.onmouseover = () => (mpvOption.style.background = "#444");
    mpvOption.onmouseout = () => (mpvOption.style.background = "transparent");

    // 温馨提示
    const hint = document.createElement("div");
    hint.innerText = "💡 按住 Shift 键右键可使用原生菜单";
    hint.style.cssText = `font-size: 11px; color: #888; text-align: center; padding-top: 6px; border-top: 1px solid #444; margin: 4px 10px 0 10px;`;

    menu.appendChild(mpvOption);
    menu.appendChild(hint);

    // 确保 DOM 加载后挂载
    document.addEventListener("DOMContentLoaded", () => document.body.appendChild(menu));

    let currentTargetUrl = "";

    mpvOption.addEventListener("click", () => {
      if (currentTargetUrl) {
        sendToMpv(currentTargetUrl, false);
      }
      menu.style.display = "none";
    });

    // 点击其他地方隐藏菜单
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) menu.style.display = "none";
    });

    // 核心：拦截右键事件
    document.addEventListener(
      "contextmenu",
      (e) => {
        // 1. 获取点击的目标是否为 视频链接 (如首页上的视频封面)
        let link = e.target.closest("a");
        let urlToPlay = "";

        if (link && targetPatterns.some((regex) => regex.test(link.href))) {
          urlToPlay = link.href;
        }
        // 2. 如果点击的是正在播放的 视频播放器区域 本身
        else if (targetPatterns.some((regex) => regex.test(window.location.href))) {
          const isPlayerArea = e.target.closest("#bilibili-player, .bpx-player-video-wrap, #movie_player, video");
          if (isPlayerArea) {
            urlToPlay = window.location.href;
          }
        }

        if (urlToPlay) {
          // 如果用户按住了 Shift 键，放行原生右键菜单，不做处理
          if (e.shiftKey) return;

          e.preventDefault();
          e.stopPropagation(); // 阻止 B站/Youtube 默认拦截的右键菜单

          currentTargetUrl = urlToPlay;
          menu.style.display = "block";

          // 防止菜单超出屏幕边缘
          let x = e.clientX;
          let y = e.clientY;
          if (x + 180 > window.innerWidth) x = window.innerWidth - 180;
          if (y + 80 > window.innerHeight) y = window.innerHeight - 80;

          menu.style.left = x + "px";
          menu.style.top = y + "px";
        }
      },
      true,
    ); // 使用捕获阶段优先拦截
  }

  // 启用右键菜单监听
  setupContextMenu();
})();
