// ==UserScript==
// @name         AutoDL GPU 抢卡助手
// @namespace    autodl-auto-start
// @version      1.0.0
// @description  AutoDL GPU 自动监控、刷新、开机、自动确认与桌面通知
// @match        https://www.autodl.com/*
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // =====================================================
    // 配置
    // =====================================================

    const REFRESH_INTERVAL = 60000; // 页面内刷新：60 秒
    const CHECK_INTERVAL = 100;     // GPU 状态检测：100ms
    const CONFIRM_INTERVAL = 30;    // 确认按钮检测：30ms

    // 成功提醒
    const ENABLE_DESKTOP_NOTIFICATION = true;
    const ENABLE_TITLE_FLASH = true;

    // =====================================================
    // 状态
    // =====================================================

    let targetId = '';

    let running = false;
    let starting = false;
    let finished = false;

    let refreshCount = 0;
    let nextRefreshAt = 0;

    let refreshTimer = null;
    let checkTimer = null;
    let confirmTimer = null;
    let uiTimer = null;

    // 提醒
    let titleFlashTimer = null;
    let originalTitle = document.title;

    // =====================================================
    // 创建面板
    // =====================================================

    const panel = document.createElement('div');
    panel.id = 'adl-panel';

    panel.innerHTML = `
        <div id="adl-header">
            <div class="adl-brand">
                <div class="adl-logo">
                    <svg viewBox="0 0 24 24">
                        <path d="M13.2 2.3 5.6 12.8h5.5l-.7 8.9 8-11.7h-5.5l.3-7.7Z"></path>
                    </svg>
                </div>
                <span class="adl-title">AutoDL 抢卡助手</span>
            </div>

            <div class="adl-window-actions">
                <button id="adl-collapse" title="收起">−</button>
                <button id="adl-close" title="关闭">×</button>
            </div>
        </div>

        <div id="adl-content">
            <div class="adl-field">
                <div class="adl-label">实例 ID</div>

                <div class="adl-input-wrap">
                    <span class="adl-input-prefix">#</span>
                    <input
                        id="adl-id"
                        type="text"
                        placeholder="输入实例 ID"
                        autocomplete="off"
                        spellcheck="false"
                    >
                </div>
            </div>

            <div class="adl-actions">
                <button id="adl-start">
                    <svg class="adl-start-icon" viewBox="0 0 24 24">
                        <path d="M8 5.5v13l10-6.5L8 5.5Z"></path>
                    </svg>
                    <span id="adl-start-text">开始监控</span>
                </button>

                <button id="adl-stop">
                    <span class="adl-stop-icon"></span>
                    <span>停止</span>
                </button>
            </div>

            <div id="adl-status" data-state="idle">
                <div class="adl-status-icon">
                    <span id="adl-status-dot"></span>

                    <svg id="adl-status-success-icon" viewBox="0 0 24 24">
                        <path
                            d="M5 12.5 9.2 17 19 7"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.4"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        ></path>
                    </svg>

                    <svg id="adl-status-error-icon" viewBox="0 0 24 24">
                        <path
                            d="M7 7l10 10M17 7 7 17"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                            stroke-linecap="round"
                        ></path>
                    </svg>
                </div>

                <div class="adl-status-content">
                    <div id="adl-status-title">未启动</div>
                    <div id="adl-status-detail"></div>
                </div>
            </div>
        </div>
    `;

    // =====================================================
    // CSS
    // =====================================================

    const style = document.createElement('style');

    style.textContent = `
        #adl-panel,
        #adl-panel * {
            box-sizing: border-box;
        }

        #adl-panel {
            font-family: inherit;
        }

        #adl-panel button,
        #adl-panel input {
            font-family: inherit;
        }

        #adl-panel {
            position: fixed;
            top: 78px;
            right: 22px;
            width: 292px;
            z-index: 2147483647;
            overflow: hidden;
            background: #ffffff;
            border: 1px solid #e6e9ee;
            border-radius: 15px;
            color: #444b55;
            box-shadow:
                0 16px 38px rgba(35, 45, 60, .09),
                0 3px 10px rgba(35, 45, 60, .04);
            transition:
                width .2s ease,
                border-color .2s ease,
                box-shadow .2s ease;
        }

        #adl-panel:hover {
            box-shadow:
                0 18px 42px rgba(35, 45, 60, .11),
                0 4px 12px rgba(35, 45, 60, .045);
        }

        #adl-header {
            height: 59px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 11px 0 14px;
            border-bottom: 1px solid #eef0f3;
            cursor: move;
            user-select: none;
        }

        .adl-brand {
            display: flex;
            align-items: center;
            gap: 9px;
        }

        .adl-logo {
            width: 31px;
            height: 31px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 9px;
            background: #f3f6fa;
            color: #3b82f6;
        }

        .adl-logo svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        .adl-title {
            color: #414750;
            font-size: 14px;
            font-weight: 600;
            line-height: 20px;
            white-space: nowrap;
        }

        .adl-window-actions {
            display: flex;
            align-items: center;
            gap: 2px;
        }

        .adl-window-actions button {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border: 0;
            border-radius: 7px;
            background: transparent;
            color: #a1a7b0;
            font-size: 18px;
            font-weight: 400;
            line-height: 1;
            cursor: pointer;
            transition:
                background .14s ease,
                color .14s ease;
        }

        .adl-window-actions button:hover {
            background: #f4f6f8;
            color: #626a75;
        }

        #adl-close:hover {
            background: #fff1f1;
            color: #ef4444;
        }

        #adl-content {
            padding: 15px;
        }

        #adl-panel.adl-collapsed {
            width: 210px;
        }

        #adl-panel.adl-collapsed #adl-content {
            display: none;
        }

        #adl-panel.adl-collapsed #adl-header {
            border-bottom: none;
        }

        .adl-label {
            margin: 0 0 7px 1px;
            color: #6f7680;
            font-size: 12px;
            font-weight: 500;
            line-height: 17px;
        }

        .adl-input-wrap {
            height: 42px;
            display: flex;
            align-items: center;
            overflow: hidden;
            background: #f8f9fb;
            border: 1px solid #e1e5ea;
            border-radius: 9px;
            transition:
                background .15s ease,
                border-color .15s ease,
                box-shadow .15s ease;
        }

        .adl-input-wrap:hover {
            border-color: #d3d8df;
        }

        .adl-input-wrap:focus-within {
            background: #ffffff;
            border-color: #78aaf8;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, .075);
        }

        .adl-input-prefix {
            width: 37px;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-right: 1px solid #e8ebef;
            color: #a3a9b1;
            font-size: 13px;
            font-weight: 500;
        }

        #adl-id {
            flex: 1;
            min-width: 0;
            height: 100%;
            padding: 0 11px;
            border: none;
            outline: none;
            background: transparent;
            color: #4a5059;
            font-size: 13px;
            font-weight: 400;
        }

        #adl-id::placeholder {
            color: #b0b5bc;
        }

        #adl-id:disabled {
            color: #858b94;
            cursor: not-allowed;
        }

        .adl-actions {
            display: grid;
            grid-template-columns: 1fr 82px;
            gap: 8px;
            margin-top: 12px;
        }

        .adl-actions button {
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            padding: 0 12px;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition:
                background .14s ease,
                border-color .14s ease,
                color .14s ease,
                box-shadow .14s ease,
                transform .12s ease;
        }

        #adl-start {
            border: 1px solid #3b82f6;
            background: #3b82f6;
            color: #ffffff;
            box-shadow: 0 3px 9px rgba(59, 130, 246, .16);
        }

        #adl-start:hover {
            border-color: #3175e4;
            background: #3175e4;
            box-shadow: 0 4px 11px rgba(59, 130, 246, .20);
            transform: translateY(-1px);
        }

        #adl-start:active {
            transform: translateY(0);
        }

        .adl-start-icon {
            width: 12px;
            height: 12px;
            fill: currentColor;
        }

        #adl-start.adl-running {
            border-color: #d5eadc;
            background: #f1f8f4;
            color: #289457;
            box-shadow: none;
            transform: none;
        }

        #adl-start.adl-running:hover {
            border-color: #cbe4d4;
            background: #edf7f1;
            color: #22864d;
        }

        #adl-stop {
            border: 1px solid #f0d7d7;
            background: #ffffff;
            color: #d65a5a;
        }

        #adl-stop:hover {
            border-color: #efbcbc;
            background: #fff4f4;
            color: #ef4444;
        }

        .adl-stop-icon {
            width: 7px;
            height: 7px;
            border-radius: 2px;
            background: currentColor;
        }

        #adl-status {
            min-height: 59px;
            display: flex;
            align-items: center;
            margin-top: 12px;
            padding: 10px 11px;
            border: 1px solid #e8ebef;
            border-radius: 10px;
            background: #f9fafb;
            transition:
                min-height .18s ease,
                background .18s ease,
                border-color .18s ease,
                box-shadow .18s ease;
        }

        .adl-status-icon {
            width: 31px;
            height: 31px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-right: 10px;
            border-radius: 8px;
            background: #eef0f3;
            color: #9ba2ab;
            transition:
                width .18s ease,
                height .18s ease,
                background .18s ease,
                color .18s ease;
        }

        #adl-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #aab0b8;
            transition:
                width .18s ease,
                height .18s ease,
                background .18s ease,
                box-shadow .18s ease;
        }

        #adl-status-success-icon,
        #adl-status-error-icon {
            display: none;
            width: 16px;
            height: 16px;
        }

        .adl-status-content {
            flex: 1;
            min-width: 0;
        }

        #adl-status-title {
            overflow: hidden;
            color: #626973;
            font-size: 13px;
            line-height: 18px;
            font-weight: 500;
            white-space: nowrap;
            text-overflow: ellipsis;
        }

        #adl-status-detail {
            margin-top: 2px;
            overflow: hidden;
            color: #979da5;
            font-size: 11px;
            line-height: 15px;
            font-weight: 400;
            white-space: nowrap;
            text-overflow: ellipsis;
        }

        #adl-status-detail:empty {
            display: none;
        }

        #adl-status[data-state="idle"] {
            background: #f9fafb;
            border-color: #e8ebef;
        }

        #adl-status[data-state="monitor"] {
            background: #f3faf6;
            border-color: #d6eadc;
        }

        #adl-status[data-state="monitor"] .adl-status-icon {
            background: #e5f5eb;
        }

        #adl-status[data-state="monitor"] #adl-status-dot {
            background: #22c55e;
            box-shadow: 0 0 0 4px rgba(34, 197, 94, .10);
        }

        #adl-status[data-state="monitor"] #adl-status-title {
            color: #25884c;
        }

        #adl-status[data-state="monitor"] #adl-status-detail {
            color: #6d9179;
        }

        #adl-status[data-state="starting"] {
            background: #f3f7fe;
            border-color: #d4e3fb;
        }

        #adl-status[data-state="starting"] .adl-status-icon {
            background: #e4efff;
        }

        #adl-status[data-state="starting"] #adl-status-dot {
            background: #3b82f6;
            animation: adlBluePulse 1.1s infinite;
        }

        #adl-status[data-state="starting"] #adl-status-title {
            color: #326fca;
        }

        #adl-status[data-state="starting"] #adl-status-detail {
            color: #718fb7;
        }

        #adl-status[data-state="warning"] {
            background: #fff5f5;
            border-color: #f1d4d4;
        }

        #adl-status[data-state="warning"] .adl-status-icon {
            background: #fde7e7;
            color: #ef4444;
        }

        #adl-status[data-state="warning"] #adl-status-dot {
            display: none;
        }

        #adl-status[data-state="warning"] #adl-status-error-icon {
            display: block;
        }

        #adl-status[data-state="warning"] #adl-status-title {
            color: #d24b4b;
        }

        #adl-status[data-state="warning"] #adl-status-detail {
            color: #a97c7c;
        }

        #adl-status[data-state="success"] {
            min-height: 64px;
            background: #f2faf5;
            border-color: #cfe9d8;
            box-shadow: 0 3px 10px rgba(34, 197, 94, .07);
        }

        #adl-status[data-state="success"] .adl-status-icon {
            width: 34px;
            height: 34px;
            background: #def3e5;
            color: #22a957;
        }

        #adl-status[data-state="success"] #adl-status-dot {
            display: none;
        }

        #adl-status[data-state="success"] #adl-status-success-icon {
            display: block;
        }

        #adl-status[data-state="success"] #adl-status-title {
            color: #208a49;
            font-size: 14px;
            line-height: 19px;
            font-weight: 600;
        }

        #adl-status[data-state="success"] #adl-status-detail {
            color: #6b9578;
            font-size: 11px;
        }

        #adl-panel.adl-success {
            border-color: #cee6d6;
            box-shadow:
                0 16px 38px rgba(34, 197, 94, .08),
                0 3px 10px rgba(35, 45, 60, .035);
        }

        @keyframes adlBluePulse {
            0% {
                box-shadow:
                    0 0 0 0 rgba(59, 130, 246, .28);
            }

            70% {
                box-shadow:
                    0 0 0 6px rgba(59, 130, 246, 0);
            }

            100% {
                box-shadow:
                    0 0 0 0 rgba(59, 130, 246, 0);
            }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(panel);

    // =====================================================
    // DOM
    // =====================================================

    const header = panel.querySelector('#adl-header');
    const input = panel.querySelector('#adl-id');

    const startBtn = panel.querySelector('#adl-start');
    const startText = panel.querySelector('#adl-start-text');

    const stopBtn = panel.querySelector('#adl-stop');

    const closeBtn = panel.querySelector('#adl-close');
    const collapseBtn = panel.querySelector('#adl-collapse');

    const status = panel.querySelector('#adl-status');
    const statusTitle = panel.querySelector('#adl-status-title');
    const statusDetail = panel.querySelector('#adl-status-detail');

    // =====================================================
    // 通知
    // =====================================================

    function prepareNotification() {
        if (
            !ENABLE_DESKTOP_NOTIFICATION ||
            !('Notification' in window)
        ) {
            return;
        }

        if (Notification.permission === 'default') {
            try {
                Notification.requestPermission().catch(() => {});
            } catch (e) {}
        }
    }

    function showDesktopNotification() {
        if (
            !ENABLE_DESKTOP_NOTIFICATION ||
            !('Notification' in window) ||
            Notification.permission !== 'granted'
        ) {
            return;
        }

        try {
            const notification = new Notification(
                'AutoDL 抢卡成功',
                {
                    body:
                        targetId
                            ? `实例 ${targetId} 已自动提交开机`
                            : 'GPU 已抢到并自动提交开机',

                    tag: 'autodl-gpu-success',
                    requireInteraction: true,
                    silent: true
                }
            );

            notification.onclick = () => {
                try {
                    window.focus();
                    notification.close();
                } catch (e) {}
            };
        } catch (e) {}
    }

    function startTitleFlash() {
        if (!ENABLE_TITLE_FLASH) {
            return;
        }

        if (titleFlashTimer) {
            clearInterval(titleFlashTimer);
            titleFlashTimer = null;
        }

        originalTitle =
            document.title.replace(
                /^【抢卡成功】/,
                ''
            );

        let showSuccess = true;

        document.title =
            '【抢卡成功】' +
            originalTitle;

        titleFlashTimer =
            setInterval(
                () => {
                    showSuccess = !showSuccess;

                    document.title =
                        showSuccess
                            ? '【抢卡成功】' + originalTitle
                            : originalTitle;
                },
                800
            );

        // 最多闪烁 30 秒
        setTimeout(
            () => {
                if (titleFlashTimer) {
                    stopTitleFlash();
                }
            },
            30000
        );
    }

    function stopTitleFlash() {
        if (titleFlashTimer) {
            clearInterval(titleFlashTimer);
            titleFlashTimer = null;
        }

        if (finished) {
            document.title =
                '【抢卡成功】' +
                originalTitle;
        }
    }

    function notifySuccess() {
        showDesktopNotification();
        startTitleFlash();
    }

    window.addEventListener(
        'focus',
        () => {
            if (
                finished &&
                titleFlashTimer
            ) {
                stopTitleFlash();
            }
        }
    );

    document.addEventListener(
        'visibilitychange',
        () => {
            if (
                finished &&
                document.visibilityState === 'visible' &&
                titleFlashTimer
            ) {
                stopTitleFlash();
            }
        }
    );

    // =====================================================
    // 恢复实例 ID
    // =====================================================

    input.value =
        localStorage.getItem(
            'autodl_target_id'
        ) || '';

    // =====================================================
    // 恢复位置
    // =====================================================

    try {
        const pos =
            JSON.parse(
                localStorage.getItem(
                    'autodl_panel_position'
                ) || 'null'
            );

        if (
            pos &&
            typeof pos.left === 'number' &&
            typeof pos.top === 'number'
        ) {
            panel.style.left =
                pos.left + 'px';

            panel.style.top =
                pos.top + 'px';

            panel.style.right =
                'auto';
        }
    } catch (e) {}

    // =====================================================
    // 拖动
    // =====================================================

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener(
        'mousedown',
        e => {
            if (
                e.target.closest(
                    '.adl-window-actions'
                )
            ) {
                return;
            }

            dragging = true;

            const rect =
                panel.getBoundingClientRect();

            offsetX =
                e.clientX -
                rect.left;

            offsetY =
                e.clientY -
                rect.top;

            panel.style.left =
                rect.left + 'px';

            panel.style.top =
                rect.top + 'px';

            panel.style.right =
                'auto';

            e.preventDefault();
        }
    );

    document.addEventListener(
        'mousemove',
        e => {
            if (!dragging) {
                return;
            }

            let left =
                e.clientX -
                offsetX;

            let top =
                e.clientY -
                offsetY;

            left =
                Math.max(
                    4,
                    Math.min(
                        left,
                        window.innerWidth -
                        panel.offsetWidth -
                        4
                    )
                );

            top =
                Math.max(
                    4,
                    Math.min(
                        top,
                        window.innerHeight -
                        panel.offsetHeight -
                        4
                    )
                );

            panel.style.left =
                left + 'px';

            panel.style.top =
                top + 'px';
        }
    );

    document.addEventListener(
        'mouseup',
        () => {
            if (!dragging) {
                return;
            }

            dragging = false;

            const rect =
                panel.getBoundingClientRect();

            localStorage.setItem(
                'autodl_panel_position',
                JSON.stringify({
                    left: rect.left,
                    top: rect.top
                })
            );
        }
    );

    // =====================================================
    // 状态系统
    // =====================================================

    function setStatus(
        state,
        title,
        detail = ''
    ) {
        status.dataset.state =
            state;

        statusTitle.textContent =
            title;

        statusDetail.textContent =
            detail;

        status.title =
            detail || title;

        if (state === 'success') {
            panel.classList.add(
                'adl-success'
            );
        } else {
            panel.classList.remove(
                'adl-success'
            );
        }
    }

    // =====================================================
    // 获取目标实例
    // =====================================================

    function getTargetRow() {
        if (!targetId) {
            return null;
        }

        const rows =
            document.querySelectorAll(
                'tr.el-table__row'
            );

        for (const row of rows) {
            const text =
                row.innerText || '';

            if (
                text.includes(
                    targetId
                )
            ) {
                return row;
            }
        }

        return null;
    }

    // =====================================================
    // 页面刷新按钮
    // =====================================================

    function getRefreshButton() {
        return document.querySelector(
            'button.refresh-btn'
        );
    }

    // =====================================================
    // 开机按钮
    // =====================================================

    function getStartButton(row) {
        return [
            ...row.querySelectorAll(
                'button'
            )
        ].find(
            button =>
                (
                    button.innerText ||
                    ''
                ).trim() ===
                '开机'
        );
    }

    // =====================================================
    // 确认按钮
    // =====================================================

    function getConfirmButton() {
        return [
            ...document.querySelectorAll(
                '.el-message-box__btns button'
            )
        ].find(
            button =>
                button.offsetParent !== null &&
                !button.disabled &&
                (
                    button.innerText ||
                    ''
                ).trim() ===
                '确定'
        );
    }

    // =====================================================
    // GPU 检测
    // =====================================================

    function checkGPU() {
        if (
            !running ||
            starting ||
            finished
        ) {
            return;
        }

        const row =
            getTargetRow();

        if (!row) {
            setStatus(
                'warning',
                '未找到实例',
                targetId
            );

            return;
        }

        const text =
            row.innerText || '';

        if (
            !text.includes(
                'GPU充足'
            )
        ) {
            updateMonitorStatus();
            return;
        }

        const button =
            getStartButton(
                row
            );

        if (
            !button ||
            button.disabled
        ) {
            setStatus(
                'warning',
                '暂时无法开机',
                'GPU 已可用，等待按钮'
            );

            return;
        }

        starting = true;

        stopRefresh();

        startBtn.classList.remove(
            'adl-running'
        );

        startText.textContent =
            '正在开机';

        setStatus(
            'starting',
            '正在开机',
            '检测到 GPU 可用'
        );

        waitConfirm();

        button.click();
    }

    // =====================================================
    // 等待确认
    // =====================================================

    function waitConfirm() {
        const begin =
            Date.now();

        confirmTimer =
            setInterval(
                () => {
                    const confirm =
                        getConfirmButton();

                    if (confirm) {
                        clearInterval(
                            confirmTimer
                        );

                        confirmTimer =
                            null;

                        confirm.click();

                        finished = true;
                        running = false;
                        starting = false;

                        stopRefresh();

                        if (checkTimer) {
                            clearInterval(
                                checkTimer
                            );

                            checkTimer =
                                null;
                        }

                        input.disabled =
                            false;

                        startBtn.classList.remove(
                            'adl-running'
                        );

                        startText.textContent =
                            '已完成';

                        setStatus(
                            'success',
                            '抢卡成功',
                            '已自动提交开机'
                        );

                        notifySuccess();

                        return;
                    }

                    if (
                        Date.now() -
                        begin >
                        10000
                    ) {
                        clearInterval(
                            confirmTimer
                        );

                        confirmTimer =
                            null;

                        starting =
                            false;

                        startBtn.classList.add(
                            'adl-running'
                        );

                        startText.textContent =
                            '监控中';

                        setStatus(
                            'warning',
                            '确认未完成',
                            '继续监控'
                        );

                        startRefresh();
                    }
                },
                CONFIRM_INTERVAL
            );
    }

    // =====================================================
    // 页面刷新
    // =====================================================

    function refreshData() {
        if (
            !running ||
            starting ||
            finished
        ) {
            return;
        }

        const row =
            getTargetRow();

        if (
            row &&
            (
                row.innerText ||
                ''
            ).includes(
                'GPU充足'
            )
        ) {
            checkGPU();
            return;
        }

        const button =
            getRefreshButton();

        if (
            !button ||
            button.disabled ||
            button.offsetParent === null
        ) {
            return;
        }

        refreshCount++;

        button.click();

        nextRefreshAt =
            Date.now() +
            REFRESH_INTERVAL;

        updateMonitorStatus();
    }

    function startRefresh() {
        if (
            refreshTimer ||
            !running
        ) {
            return;
        }

        nextRefreshAt =
            Date.now() +
            REFRESH_INTERVAL;

        refreshTimer =
            setInterval(
                refreshData,
                REFRESH_INTERVAL
            );
    }

    function stopRefresh() {
        if (refreshTimer) {
            clearInterval(
                refreshTimer
            );

            refreshTimer =
                null;
        }
    }

    // =====================================================
    // 更新状态
    // =====================================================

    function updateMonitorStatus() {
        if (!running) {
            return;
        }

        const seconds =
            Math.max(
                0,
                Math.ceil(
                    (
                        nextRefreshAt -
                        Date.now()
                    ) / 1000
                )
            );

        if (refreshCount === 0) {
            setStatus(
                'monitor',
                '正在监控',
                `${seconds}s 后刷新`
            );
        } else {
            setStatus(
                'monitor',
                '正在监控',
                `${refreshCount} 次刷新 · ${seconds}s`
            );
        }
    }

    // =====================================================
    // 每秒更新 UI
    // =====================================================

    uiTimer =
        setInterval(
            () => {
                if (
                    running &&
                    !starting &&
                    !finished
                ) {
                    updateMonitorStatus();
                }
            },
            1000
        );

    // =====================================================
    // 开始
    // =====================================================

    startBtn.addEventListener(
        'click',
        () => {
            const id =
                input.value.trim();

            if (!id) {
                setStatus(
                    'warning',
                    '请输入实例 ID'
                );

                input.focus();

                return;
            }

            // 第一次点击开始时申请通知权限
            prepareNotification();

            stopAll();

            if (titleFlashTimer) {
                clearInterval(
                    titleFlashTimer
                );

                titleFlashTimer =
                    null;
            }

            originalTitle =
                document.title.replace(
                    /^【抢卡成功】/,
                    ''
                );

            document.title =
                originalTitle;

            targetId =
                id;

            localStorage.setItem(
                'autodl_target_id',
                targetId
            );

            running = true;
            starting = false;
            finished = false;

            refreshCount = 0;

            input.disabled = true;

            startBtn.classList.add(
                'adl-running'
            );

            startText.textContent =
                '监控中';

            setStatus(
                'monitor',
                '正在监控',
                '等待 GPU'
            );

            checkTimer =
                setInterval(
                    checkGPU,
                    CHECK_INTERVAL
                );

            startRefresh();

            checkGPU();
        }
    );

    // =====================================================
    // Enter 启动
    // =====================================================

    input.addEventListener(
        'keydown',
        e => {
            if (
                e.key === 'Enter' &&
                !input.disabled
            ) {
                startBtn.click();
            }
        }
    );

    // =====================================================
    // 停止
    // =====================================================

    stopBtn.addEventListener(
        'click',
        () => {
            running = false;
            starting = false;
            finished = false;

            stopAll();

            if (titleFlashTimer) {
                clearInterval(
                    titleFlashTimer
                );

                titleFlashTimer =
                    null;
            }

            document.title =
                originalTitle;

            input.disabled =
                false;

            startBtn.classList.remove(
                'adl-running'
            );

            startText.textContent =
                '开始监控';

            setStatus(
                'idle',
                '已停止'
            );
        }
    );

    // =====================================================
    // 收起
    // =====================================================

    collapseBtn.addEventListener(
        'click',
        e => {
            e.stopPropagation();

            panel.classList.toggle(
                'adl-collapsed'
            );

            collapseBtn.textContent =
                panel.classList.contains(
                    'adl-collapsed'
                )
                    ? '+'
                    : '−';
        }
    );

    // =====================================================
    // 关闭
    // =====================================================

    closeBtn.addEventListener(
        'click',
        e => {
            e.stopPropagation();

            running = false;

            stopAll();

            if (titleFlashTimer) {
                clearInterval(
                    titleFlashTimer
                );

                titleFlashTimer =
                    null;
            }

            if (uiTimer) {
                clearInterval(
                    uiTimer
                );

                uiTimer =
                    null;
            }

            panel.remove();
        }
    );

    // =====================================================
    // 清理
    // =====================================================

    function stopAll() {
        if (refreshTimer) {
            clearInterval(
                refreshTimer
            );

            refreshTimer =
                null;
        }

        if (checkTimer) {
            clearInterval(
                checkTimer
            );

            checkTimer =
                null;
        }

        if (confirmTimer) {
            clearInterval(
                confirmTimer
            );

            confirmTimer =
                null;
        }
    }

})();
