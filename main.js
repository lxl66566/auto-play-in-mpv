// ==UserScript==
// @name         Open in MPV
// @description  Open online video in local mpv player
// @author       lxl66566
// @namespace    https://github.com/lxl66566/open-in-mpv
// @version      0.1.0
// @icon 				 https://mpv.io/images/mpv-logo-128-0baae5aa.png
// @run-at       document-start
// @license      MIT
// @grant        window.close
// @match        *://*.bilibili.com/*
// @match        *://bilibili.com/*
// @match        *://youtube.com/*
// @match        *://*.youtube.com/*
// ==/UserScript==

(function () {
	// rome-ignore lint/suspicious/noRedundantUseStrict:
	"use strict";

	// 要拦截的URL模式
	const targetPatterns = [
		"https://www.bilibili.com/video/*",
		"https://live.bilibili.com/*",
		"https://www.bilibili.com/bangumi/play/*",
		"https://www.youtube.com/watch*",
		"https://www.youtube.com/playlist*",
	];

	const socket = new WebSocket("ws://localhost:5777");
	socket.onopen = function () {
		console.log("WebSocket connection established");
	};
	socket.onmessage = function (event) {
		console.log("Message from server: ", event.data);
	};
	socket.onclose = function () {
		console.log("WebSocket connection closed");
	};
	socket.onerror = function (error) {
		console.error("WebSocket error: ", error);
	};

	function sendUrlToServer(url) {
		if (socket.readyState === WebSocket.OPEN) {
			socket.send(url);
			return true;
		} else {
			console.error("WebSocket is not open");
			return false;
		}
	}

	function trigger() {
		const url = window.location.href;
		console.log("play-with-mpv: get url: ", url);
		if (targetPatterns.some((pattern) => url.match(pattern))) {
			console.log("play-with-mpv: url match");
			if (sendUrlToServer(url)) window.close();
		}
	}

	window.addEventListener("DOMContentLoaded", trigger, false); // for bilibili
	window.addEventListener("hashchange", trigger, false); // for youtube

	// const originalOpen = window.open;
	// window.open = function (url, ...args) {
	// 	console.log("捕获到新页面打开请求:", url);
	// 	// return originalOpen.call(window, url, ...args); // 若允许则执行
	// 	return null; // 若阻止则返回 null
	// };
})();
