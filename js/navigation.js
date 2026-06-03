/**
 * 2048 游戏页面导航/视图切换模块
 *
 * 使用 IIFE 风格，将模块挂载到 window.Game2048.Navigation 对象上。
 * 负责顶部导航按钮与四个视图（游戏/排行榜/成就/简历）的显示切换。
 */
(function () {
    'use strict';

    // 确保命名空间存在
    window.Game2048 = window.Game2048 || {};

    /**
     * 切换视图：隐藏所有视图，仅显示指定目标视图
     * @param {string} viewName - 目标视图名称（game / leaderboard / achievements / resume）
     */
    function switchView(viewName) {
        var views = document.querySelectorAll('.view');
        var navBtns = document.querySelectorAll('.nav-btn');

        // 隐藏所有视图
        for (var i = 0; i < views.length; i++) {
            views[i].style.display = 'none';
        }

        // 显示目标视图
        var targetView = document.getElementById(viewName + '-view');
        if (targetView) {
            targetView.style.display = '';
        }

        // 更新导航按钮高亮
        for (var j = 0; j < navBtns.length; j++) {
            var btnView = navBtns[j].getAttribute('data-view');
            if (btnView === viewName) {
                navBtns[j].classList.add('active');
            } else {
                navBtns[j].classList.remove('active');
            }
        }
    }

    /**
     * 初始化导航：默认隐藏排行榜/成就视图，保留游戏视图
     * @returns {void}
     */
    function init() {
        var leaderboardView = document.getElementById('leaderboard-view');
        var achievementsView = document.getElementById('achievements-view');
        if (leaderboardView) leaderboardView.style.display = 'none';
        if (achievementsView) achievementsView.style.display = 'none';
    }

    // 对外暴露的 API
    window.Game2048.Navigation = {
        switchView: switchView,
        init: init
    };
})();