/**
 * 2048 游戏方块管理模块，负责方块的 DOM 渲染、位置计算、动画样式
 *
 * 使用 IIFE 风格，将模块挂载到 window.Game2048.TileManager 对象上。
 *
 * 依赖：
 *   - window.Game2048.Game (grid / gridSize / score 等)
 */
(function () {
    'use strict';

    // 确保命名空间存在
    window.Game2048 = window.Game2048 || {};

    /**
     * 计算方块在棋盘上的百分比位置（行/列索引 -> 百分比坐标）
     * @param {number} index - 行/列索引（从 0 开始）
     * @param {number} gridSize - 网格大小
     * @returns {string} 百分比坐标字符串
     */
    function calculatePosition(index, gridSize) {
        var percentage = (index / gridSize) * 100;
        return percentage + '%';
    }

    /**
     * 获取指定值对应的 CSS 类名（如 value=2 -> 'tile-2'）
     * @param {number} value - 方块数值
     * @returns {string} CSS 类名
     */
    function getTileClass(value) {
        return value <= 2048 ? 'tile-' + value : 'tile-super';
    }

    /**
     * @namespace TileManager
     * @memberof window.Game2048
     * @description 2048 游戏方块管理对象
     */
    window.Game2048.TileManager = {

        /**
         * 初始化方块容器，根据网格大小创建背景格子
         * @returns {void}
         */
        init: function () {
            var game = window.Game2048.Game;
            if (!game) return;
            var gridSize = game.gridSize;
            var board = document.getElementById('game-board');
            if (!board) return;

            board.innerHTML = '';
            board.style.gridTemplateColumns = 'repeat(' + gridSize + ', 1fr)';
            board.style.gridTemplateRows = 'repeat(' + gridSize + ', 1fr)';

            for (var i = 0; i < gridSize * gridSize; i++) {
                var cell = document.createElement('div');
                cell.className = 'cell';
                cell.setAttribute('data-index', i);
                board.appendChild(cell);
            }
        },

        /**
         * 创建一个新的方块 DOM 并添加到容器
         * @param {number} row - 行索引
         * @param {number} col - 列索引
         * @param {number} value - 方块数值
         * @param {boolean} [isNew=true] - 是否为新方块（用于区分出现动画）
         * @returns {void}
         */
        createTile: function (row, col, value, isNew) {
            var game = window.Game2048.Game;
            if (!game || !game.grid) return;

            var container = document.getElementById('tiles-container');
            if (!container) return;

            var tile = document.createElement('div');
            tile.className = 'tile ' + getTileClass(value);
            if (isNew) tile.classList.add('new-tile');

            tile.textContent = value;
            tile.style.left = calculatePosition(col, game.gridSize);
            tile.style.top = calculatePosition(row, game.gridSize);

            container.appendChild(tile);
        },

        /**
         * 更新所有方块：清空容器后根据当前 grid 重新渲染
         * @param {number[][]} grid - 游戏二维数组
         * @param {number} gridSize - 网格大小
         * @param {{row:number, col:number}[]} [mergedCells] - 本次移动中合并的方块坐标
         * @returns {void}
         */
        updateTiles: function (grid, gridSize, mergedCells) {
            var container = document.getElementById('tiles-container');
            if (!container) return;
            container.innerHTML = '';

            for (var r = 0; r < gridSize; r++) {
                for (var c = 0; c < gridSize; c++) {
                    if (grid[r][c] !== 0) {
                        var tile = document.createElement('div');
                        tile.className = 'tile ' + getTileClass(grid[r][c]);
                        if (grid[r][c] === 2048) tile.classList.add('pulse');
                        tile.textContent = grid[r][c];
                        tile.style.left = calculatePosition(c, gridSize);
                        tile.style.top = calculatePosition(r, gridSize);

                        // 如果本次移动中该位置被合并，添加合并动画类
                        if (mergedCells) {
                            for (var i = 0; i < mergedCells.length; i++) {
                                if (mergedCells[i].row === r && mergedCells[i].col === c) {
                                    tile.classList.add('merged');
                                    break;
                                }
                            }
                        }

                        container.appendChild(tile);
                    }
                }
            }
        },

        /**
         * 清空所有方块
         * @returns {void}
         */
        clearAllTiles: function () {
            var container = document.getElementById('tiles-container');
            if (container) container.innerHTML = '';
        },

        /**
         * 切换网格大小并重新初始化背景格子
         * @param {number} size - 网格大小
         * @returns {void}
         */
        setGridSize: function (size) {
            var game = window.Game2048.Game;
            if (!game) return;
            game.gridSize = size;
            this.init();
            this.clearAllTiles();
        }
    };
})();