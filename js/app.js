/* 2048 游戏应用入口模块，负责模块初始化与全局事件绑定 */
(function () {
    'use strict';

    var App = {};

    /**
     * 初始化所有模块
     */
    function init() {
        window.Game2048.TileManager.init();
        window.Game2048.Navigation.init();
        if (window.Game2048.Achievements && typeof window.Game2048.Achievements.init === 'function') {
            window.Game2048.Achievements.init();
        }
        window.Game2048.UI.hideLoadingScreen();
    }

    /**
     * 开始游戏
     */
    function startGame() {
        window.Game2048.Game.init();
    }

    /**
     * 绑定游戏控制事件（键盘/触屏已由 Game 模块内部处理）
     */
    function bindGameControlEvents() {
        // Game 模块已内部处理所有键盘/触屏事件
        // 这里仅保留扩展入口
    }

    /**
     * 绑定导航按钮点击事件
     */
    function updateResumeStats() {
        var bestScore = 0;
        var gamesCount = 0;
        var achievementsCount = 0;

        try {
            bestScore = window.Game2048.Storage.load('2048-best-score', 0) || 0;
        } catch (e) { bestScore = 0; }

        try {
            var leaderboard = window.Game2048.Storage.load('2048-leaderboard', []) || [];
            gamesCount = Array.isArray(leaderboard) ? leaderboard.length : 0;
        } catch (e) { gamesCount = 0; }

        try {
            if (window.Game2048.Achievements && typeof window.Game2048.Achievements.getAll === 'function') {
                var allAch = window.Game2048.Achievements.getAll() || [];
                for (var k = 0; k < allAch.length; k++) {
                    if (allAch[k] && allAch[k].unlocked) achievementsCount++;
                }
            }
        } catch (e) { achievementsCount = 0; }

        var scoreEl = document.getElementById('resume-best-score');
        if (scoreEl) scoreEl.textContent = bestScore.toLocaleString();

        var gamesEl = document.getElementById('resume-games-count');
        if (gamesEl) gamesEl.textContent = gamesCount;

        var achEl = document.getElementById('resume-achievements-count');
        if (achEl) achEl.textContent = achievementsCount;

        var badges = document.querySelectorAll('.achievement-badge');
        if (badges && badges.length > 0) {
            for (var m = 0; m < badges.length; m++) {
                badges[m].classList.remove('unlocked', 'locked');
                if (achievementsCount > m) {
                    badges[m].classList.add('unlocked');
                } else {
                    badges[m].classList.add('locked');
                }
            }
        }
    }

    function bindResumeEvents() {
        var printBtn = document.getElementById('btn-print-resume');
        if (printBtn) {
            printBtn.addEventListener('click', function () {
                window.print();
            });
        }

        var playerNameInput = document.getElementById('player-name-input');
        if (playerNameInput && !playerNameInput.value) {
            try {
                var saved = window.Game2048.Storage.load('player-name', '');
                if (saved) playerNameInput.value = saved;
            } catch (e) {}
        }
    }

    function bindNavigationEvents() {
        var navBtns = document.querySelectorAll('.nav-btn');
        var i;
        for (i = 0; i < navBtns.length; i++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    var viewName = btn.getAttribute('data-view') || btn.getAttribute('data-target');
                    if (viewName) {
                        window.Game2048.Navigation.switchView(viewName);
                        if (viewName === 'resume') {
                            setTimeout(updateResumeStats, 50);
                        }
                    }
                });
            })(navBtns[i]);
        }
    }

    /**
     * 绑定排行榜相关事件
     */
    function bindLeaderboardEvents() {
        var clearBtn = document.getElementById('clear-leaderboard');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                if (confirm('确定要清空所有排行榜记录吗？')) {
                    if (window.Game2048.Leaderboard && typeof window.Game2048.Leaderboard.clear === 'function') {
                        window.Game2048.Leaderboard.clear();
                    }
                    var list = document.getElementById('leaderboard-list');
                    var bestScore = document.getElementById('leaderboard-best-score');
                    if (list) list.innerHTML = '<li class="empty-record">暂无游戏记录</li>';
                    if (bestScore) bestScore.textContent = '0';
                    window.Game2048.UI.showToast('排行榜已清空');
                }
            });
        }

        var sortBtns = document.querySelectorAll('.btn-sort');
        for (var j = 0; j < sortBtns.length; j++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    var sortType = btn.getAttribute('data-sort');
                    for (var k = 0; k < sortBtns.length; k++) sortBtns[k].classList.remove('active');
                    btn.classList.add('active');
                    if (window.Game2048.Leaderboard && typeof window.Game2048.Leaderboard.sortBy === 'function') {
                        window.Game2048.Leaderboard.sortBy(sortType);
                    }
                });
            })(sortBtns[j]);
        }

        var shareBtn = document.getElementById('share-score');
        if (shareBtn) {
            shareBtn.addEventListener('click', function () {
                if (window.Game2048.Share && typeof window.Game2048.Share.shareCurrentGame === 'function') {
                    window.Game2048.Share.shareCurrentGame();
                } else {
                    window.Game2048.UI.showToast('分享功能不可用');
                }
            });
        }
    }

    /**
     * 绑定设置面板事件
     */
    function bindSettingsEvents() {
        var showTutorialBtn = document.getElementById('show-tutorial-btn');
        if (showTutorialBtn) {
            showTutorialBtn.addEventListener('click', function () {
                if (window.Game2048.UI && typeof window.Game2048.UI.showTutorial === 'function') {
                    window.Game2048.UI.showTutorial();
                }
            });
        }
    }

    /**
     * 绑定键盘快捷键（P - 暂停）
     */
    function bindKeyboardEvents() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'p' || e.key === 'P') {
                if (window.Game2048.Game && typeof window.Game2048.Game.togglePause === 'function') {
                    window.Game2048.Game.togglePause();
                }
            }
        });
    }

    /**
     * 绑定触屏滑动事件（游戏面板区域）
     */
    function bindTouchEvents() {
        var gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;
        var startX = 0, startY = 0;
        var minSwipeDistance = 30;
        gameBoard.addEventListener('touchstart', function (e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        gameBoard.addEventListener('touchend', function (e) {
            var deltaX = e.changedTouches[0].clientX - startX;
            var deltaY = e.changedTouches[0].clientY - startY;
            if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) return;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) window.Game2048.Game.move('right');
                else window.Game2048.Game.move('left');
            } else {
                if (deltaY > 0) window.Game2048.Game.move('down');
                else window.Game2048.Game.move('up');
            }
        }, { passive: true });
    }

    /**
     * 对外暴露的初始化入口
     */
    App.init = function () {
        bindNavigationEvents();
        bindGameControlEvents();
        bindLeaderboardEvents();
        bindSettingsEvents();
        bindResumeEvents();
        bindKeyboardEvents();
        bindTouchEvents();
        init();
        startGame();
    };

    // 页面 DOM 加载完成后启动应用
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', App.init);
    } else {
        App.init();
    }

    global.Game2048.App = App;
})(window);