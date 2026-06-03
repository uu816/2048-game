/**
 * 2048 游戏分享功能模块，生成分数文本并复制到剪贴板
 */
(function () {
    'use strict';

    /**
     * @namespace Share
     * @memberof window.Game2048
     * @description 2048 游戏分享功能对象
     */
    window.Game2048 = window.Game2048 || {};
    window.Game2048.Share = {

        /**
         * 生成分享文本
         * @param {number} score - 当前游戏分数
         * @param {number} gridSize - 游戏网格大小
         * @param {number} duration - 游戏用时（秒）
         * @returns {string} 格式化后的分享文本
         */
        generateText: function (score, gridSize, duration) {
            return '\u6211\u5728 2048 \u5c0f\u6e38\u620f\u4e2d\u83b7\u5f97\u4e86 ' + score + ' \u5206\uff01\u7f51\u683c\u5927\u5c0f\uff1a' + gridSize + '\u00d7' + gridSize + '\uff0c\u7528\u65f6\uff1a' + duration + '\u79d2\u3002\u6765\u6311\u6218\u6211\u5427\uff01';
        },

        /**
         * 复制文本到剪贴板
         * 优先使用 Clipboard API，不可用时降级为 execCommand
         * @param {string} text - 需要复制的文本内容
         * @returns {Promise<boolean>} 复制成功返回 true，失败返回 false
         */
        copy: function (text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text).then(function () {
                    return true;
                }).catch(function () {
                    return fallbackCopy(text);
                });
            }
            return Promise.resolve(fallbackCopy(text));

            /**
             * 降级复制方案：使用隐藏 textarea + execCommand
             * @param {string} content - 需要复制的文本
             * @returns {boolean} 复制是否成功
             */
            function fallbackCopy(content) {
                var textarea = document.createElement('textarea');
                textarea.value = content;
                textarea.style.position = 'fixed';
                textarea.style.top = '0';
                textarea.style.left = '0';
                textarea.style.width = '1px';
                textarea.style.height = '1px';
                textarea.style.padding = '0';
                textarea.style.border = 'none';
                textarea.style.outline = 'none';
                textarea.style.boxShadow = 'none';
                textarea.style.background = 'transparent';
                textarea.setAttribute('readonly', '');
                document.body.appendChild(textarea);
                textarea.select();
                textarea.setSelectionRange(0, content.length);
                var success = false;
                try {
                    success = document.execCommand('copy');
                } catch (e) {
                    success = false;
                }
                document.body.removeChild(textarea);
                return success;
            }
        },

        /**
         * 分享当前游戏成绩（游戏结束时调用）
         * 从 Game 对象获取分数、网格大小与游戏时长，生成分享文本并复制到剪贴板
         * @returns {void}
         */
        shareCurrentGame: function () {
            var Game = window.Game2048.Game;
            var UI = window.Game2048.UI;
            if (!Game || !UI) {
                if (UI) UI.showToast('\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236');
                return;
            }
            var score = typeof Game.getScore === 'function' ? Game.getScore() : (Game.score || 0);
            var gridSize = typeof Game.getGridSize === 'function' ? Game.getGridSize() : (Game.gridSize || 4);
            var duration = typeof Game.getDuration === 'function' ? Game.getDuration() : (Game.duration || 0);
            var text = window.Game2048.Share.generateText(score, gridSize, duration);
            window.Game2048.Share.copy(text).then(function (success) {
                if (success) {
                    UI.showToast('\ud83d\udccb \u5206\u4eab\u6587\u672c\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f\uff01');
                } else {
                    UI.showToast('\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236');
                }
            }).catch(function () {
                UI.showToast('\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236');
            });
        }
    };
})();