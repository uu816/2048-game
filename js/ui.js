/**
 * 2048 游戏 UI 辅助模块，负责 Toast 提示、新手引导、成就解锁弹窗等通用 UI
 *
 * 使用 IIFE 风格，将模块挂载到 window.Game2048.UI 对象上。
 */
(function () {
    'use strict';

    // 确保命名空间存在
    window.Game2048 = window.Game2048 || {};

    /**
     * @namespace UI
     * @memberof window.Game2048
     * @description 2048 游戏 UI 辅助对象
     */
    window.Game2048.UI = {

        /**
         * 显示 Toast 提示
         * @param {string} msg - 提示信息
         * @param {number} [duration=2000] - 自动消失时间（毫秒）
         * @returns {void}
         */
        showToast: function (msg, duration) {
            var toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = msg;
            document.body.appendChild(toast);

            // 触发动画
            requestAnimationFrame(function () {
                toast.classList.add('toast-in');
            });

            setTimeout(function () {
                toast.classList.remove('toast-in');
                toast.classList.add('toast-out');
                setTimeout(function () { toast.remove(); }, 300);
            }, duration || 2000);
        },

        /**
         * 显示成就解锁弹窗（从右上角滑入）
         * @param {Object} achievement - 成就对象，需包含 icon/name/description
         * @returns {void}
         */
        showAchievementUnlock: function (achievement) {
            var el = document.createElement('div');
            el.className = 'achievement-unlock';
            el.innerHTML =
                '<div class="achievement-header">' +
                    '<span class="achievement-icon">' + achievement.icon + '</span>' +
                    '<span class="achievement-title">' + achievement.name + '</span>' +
                    '<span class="achievement-label">解锁</span>' +
                '</div>' +
                '<p class="achievement-desc">' + achievement.description + '</p>';
            document.body.appendChild(el);

            el.addEventListener('animationend', function () {
                setTimeout(function () { el.remove(); }, 2000);
            });
        },

        /**
         * 显示新手引导弹窗
         * @returns {void}
         */
        showTutorial: function () {
            var modal = document.getElementById('tutorial-modal');
            if (!modal) return;
            modal.classList.add('active');

            var closeBtn = document.getElementById('close-tutorial');
            var okBtn = document.getElementById('tutorial-ok');
            var close = function () {
                modal.classList.remove('active');
            };
            if (closeBtn) closeBtn.addEventListener('click', close);
            if (okBtn) okBtn.addEventListener('click', close);
        },

        /**
         * 隐藏加载画面
         * @returns {void}
         */
        hideLoadingScreen: function () {
            var loadingScreen = document.getElementById('loading-screen');
            if (!loadingScreen) return;
            loadingScreen.classList.remove('loading-active');
            loadingScreen.classList.add('loading-hidden');
            setTimeout(function () {
                if (loadingScreen.parentNode) loadingScreen.remove();
            }, 500);
        }
    };
})();