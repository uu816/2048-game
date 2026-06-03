/**
 * 2048 游戏核心逻辑模块，包含游戏状态管理、移动合并逻辑、计分系统
 *
 * 使用 IIFE 风格，将模块挂载到 window.Game2048.Game 对象上。
 *
 * 模块通信规范：
 *   - window.Game2048.Storage     持久化（最高分、主题、排行榜等）
 *   - window.Game2048.TileManager 方块渲染（创建/更新/清空方块）
 *   - window.Game2048.Leaderboard 排行榜（保存记录）
 *   - window.Game2048.Achievements 成就系统（check(Game)）
 *   - window.Game2048.UI          通用 UI 辅助（Toast 等）
 */
(function (global) {
    'use strict';

    if (!global.Game2048) global.Game2048 = {};

    var STORAGE_BEST_SCORE_KEY = '2048-best-score';
    var STORAGE_THEME_KEY = '2048-theme';
    var DEFAULT_THEME = 'fresh';
    var DEFAULT_ANIMATION_SPEED = 150;
    var DEFAULT_GRID_SIZE = 4;

    /**
     * 获取其他模块（容错式访问）
     */
    function module(name) {
        return global.Game2048 && global.Game2048[name];
    }

    var Game = {
        /** 二维数组，存储每个格子的数值 */
        grid: [],
        /** 当前分数 */
        score: 0,
        /** 历史最高分 */
        bestScore: 0,
        /** 网格大小（4 或 5） */
        gridSize: DEFAULT_GRID_SIZE,
        /** 动画速度（毫秒） */
        animationSpeed: DEFAULT_ANIMATION_SPEED,
        /** 是否正在执行动画（防抖） */
        isAnimating: false,
        /** 是否处于暂停状态 */
        isPaused: false,
        /** 是否已达到 2048 胜利条件 */
        hasWon: false,
        /** 是否已游戏结束 */
        isGameOver: false,
        /** 游戏开始时间戳（毫秒，用于计算 duration） */
        startTime: 0,
        /** 是否已经达到 512（用于成就判断） */
        has512: false,
        /** 玩家昵称 */
        playerName: '玩家',

        /**
         * 初始化入口：加载最高分与主题、绑定事件监听、开始新游戏
         */
        init: function() {
            this.loadBestScore();
            this.loadTheme();
            this.setupEventListeners();
            this.newGame();
        },

        /**
         * 从 Storage 加载主题偏好，保存到 document.documentElement class
         */
        loadTheme: function() {
            var Storage = module('Storage');
            var savedTheme = Storage
                ? Storage.load(STORAGE_THEME_KEY, DEFAULT_THEME)
                : (localStorage.getItem(STORAGE_THEME_KEY) || DEFAULT_THEME);
            this.applyTheme(savedTheme);
            var themeSelect = document.getElementById('theme-select');
            if (themeSelect) themeSelect.value = savedTheme;
        },

        /**
         * 应用主题（fresh/cyber），并持久化
         * @param {string} theme 主题名：'fresh' | 'cyber'
         */
        applyTheme: function(theme) {
            var root = document.documentElement;
            if (theme === 'cyber') {
                root.classList.add('theme-cyber');
            } else {
                root.classList.remove('theme-cyber');
            }
            var Storage = module('Storage');
            if (Storage) {
                Storage.save(STORAGE_THEME_KEY, theme);
            } else {
                localStorage.setItem(STORAGE_THEME_KEY, theme);
            }
        },

        /**
         * 从 Storage 加载历史最高分，并刷新 UI
         */
        loadBestScore: function() {
            var Storage = module('Storage');
            var saved = Storage
                ? Storage.load(STORAGE_BEST_SCORE_KEY, 0)
                : localStorage.getItem(STORAGE_BEST_SCORE_KEY);
            this.bestScore = saved ? parseInt(saved, 10) : 0;
            this.updateScoreDisplay();
        },

        /**
         * 保存当前最高分到 Storage
         */
        saveBestScore: function() {
            var Storage = module('Storage');
            if (Storage) {
                Storage.save(STORAGE_BEST_SCORE_KEY, this.bestScore);
            } else {
                localStorage.setItem(STORAGE_BEST_SCORE_KEY, String(this.bestScore));
            }
        },

        /**
         * 开始新游戏：重置 grid/score/状态，清空方块，生成 2 个随机方块，并刷新成就
         */
        newGame: function() {
            this.grid = Array(this.gridSize).fill(null).map(function() { return Array(this.gridSize).fill(0); }.bind(this));
            this.score = 0;
            this.hasWon = false;
            this.isGameOver = false;
            this.isAnimating = false;
            this.isPaused = false;
            this.has512 = false;
            this.startTime = Date.now();

            var TileManager = module('TileManager');
            if (TileManager && TileManager.clearAllTiles) TileManager.clearAllTiles();

            this.hideModals();
            this.updatePauseButton();
            this.addRandomTile();
            this.addRandomTile();
            this.updateScoreDisplay();

            var Achievements = module('Achievements');
            if (Achievements && Achievements.check) Achievements.check(this);
        },

        /**
         * 切换暂停状态
         */
        togglePause: function() {
            this.isPaused = !this.isPaused;
            this.updatePauseButton();
        },

        /**
         * 刷新暂停按钮文案与暂停遮罩显示
         */
        updatePauseButton: function() {
            var pauseBtn = document.getElementById('pause-btn');
            var pauseOverlay = document.getElementById('pause-overlay');
            if (pauseBtn) pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
            if (pauseOverlay) pauseOverlay.style.display = this.isPaused ? 'flex' : 'none';
        },

        /**
         * 隐藏胜利 / 游戏结束弹窗
         */
        hideModals: function() {
            var winModal = document.getElementById('win-modal');
            var overModal = document.getElementById('gameover-modal');
            if (winModal) winModal.classList.remove('active');
            if (overModal) overModal.classList.remove('active');
        },

        /**
         * 随机空格生成新方块（90% 概率 2，10% 概率 4）
         * @returns {boolean} 是否成功添加（无空格时返回 false）
         */
        addRandomTile: function() {
            var emptyCells = this.getEmptyCells();
            if (emptyCells.length === 0) return false;
            var cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            var value = Math.random() < 0.9 ? 2 : 4;
            this.grid[cell.row][cell.col] = value;
            var TileManager = module('TileManager');
            if (TileManager && TileManager.createTile) TileManager.createTile(cell.row, cell.col, value, true);
            return true;
        },

        /**
         * 获取所有空格的坐标数组
         * @returns {Array} 空格坐标数组
         */
        getEmptyCells: function() {
            var empty = [];
            for (var r = 0; r < this.gridSize; r++) {
                for (var c = 0; c < this.gridSize; c++) {
                    if (this.grid[r][c] === 0) empty.push({ row: r, col: c });
                }
            }
            return empty;
        },

        /**
         * 处理方向输入：'up' | 'down' | 'left' | 'right'
         * @param {string} direction 移动方向
         */
        move: function(direction) {
            if (this.isAnimating || this.isGameOver || this.isPaused) return;
            var moved = false;
            switch (direction) {
                case 'up':    moved = this.moveUp();    break;
                case 'down':  moved = this.moveDown();  break;
                case 'left':  moved = this.moveLeft();  break;
                case 'right': moved = this.moveRight(); break;
            }
            if (moved) {
                var self = this;
                this.isAnimating = true;
                setTimeout(function() {
                    self.addRandomTile();
                    self.checkWinCondition();
                    var Achievements = module('Achievements');
                    if (Achievements && Achievements.check) Achievements.check(self);
                    if (!self.canMove()) self.gameOver();
                    self.isAnimating = false;
                }, this.animationSpeed);
            }
        },

        /**
         * 向上移动合并：每列自上到下移动
         * @returns {boolean} 是否发生移动/合并
         */
        moveUp: function() {
            var moved = false, totalScore = 0;
            var mergedCells = [];
            for (var col = 0; col < this.gridSize; col++) {
                var column = [];
                for (var row = 0; row < this.gridSize; row++) column.push(this.grid[row][col]);
                var result = this.moveLine(column);
                if (result.moved) moved = true;
                totalScore += result.scoreGained;
                result.mergedPositions.forEach(function(idx) { mergedCells.push({ row: idx, col: col }); });
                for (var row = 0; row < this.gridSize; row++) this.grid[row][col] = result.newLine[row];
            }
            if (moved) {
                this.score += totalScore;
                var TileManager = module('TileManager');
                if (TileManager && TileManager.updateTiles) TileManager.updateTiles(this.grid, this.gridSize, mergedCells);
                this.updateScoreDisplay();
                this.showFloatingScore(totalScore);
            }
            return moved;
        },

        /**
         * 向下移动合并：每列自下到上移动（反转列 -> moveLine -> 反转回）
         * @returns {boolean} 是否发生移动/合并
         */
        moveDown: function() {
            var moved = false, totalScore = 0;
            var mergedCells = [];
            for (var col = 0; col < this.gridSize; col++) {
                var column = [];
                for (var row = this.gridSize - 1; row >= 0; row--) column.push(this.grid[row][col]);
                var result = this.moveLine(column);
                if (result.moved) moved = true;
                totalScore += result.scoreGained;
                result.mergedPositions.forEach(function(idx) { mergedCells.push({ row: this.gridSize - 1 - idx, col: col }); });
                for (var row = this.gridSize - 1, i = 0; row >= 0; row--, i++) this.grid[row][col] = result.newLine[i];
            }
            if (moved) {
                this.score += totalScore;
                var TileManager = module('TileManager');
                if (TileManager && TileManager.updateTiles) TileManager.updateTiles(this.grid, this.gridSize, mergedCells);
                this.updateScoreDisplay();
                this.showFloatingScore(totalScore);
            }
            return moved;
        },

        /**
         * 向左移动合并：每行直接移动
         * @returns {boolean} 是否发生移动/合并
         */
        moveLeft: function() {
            var moved = false, totalScore = 0;
            var mergedCells = [];
            for (var row = 0; row < this.gridSize; row++) {
                var result = this.moveLine(this.grid[row]);
                if (result.moved) moved = true;
                totalScore += result.scoreGained;
                result.mergedPositions.forEach(function(idx) { mergedCells.push({ row: row, col: idx }); });
                this.grid[row] = result.newLine;
            }
            if (moved) {
                this.score += totalScore;
                var TileManager = module('TileManager');
                if (TileManager && TileManager.updateTiles) TileManager.updateTiles(this.grid, this.gridSize, mergedCells);
                this.updateScoreDisplay();
                this.showFloatingScore(totalScore);
            }
            return moved;
        },

        /**
         * 向右移动合并：反转行 -> moveLine -> 反转回
         * @returns {boolean} 是否发生移动/合并
         */
        moveRight: function() {
            var moved = false, totalScore = 0;
            var mergedCells = [];
            for (var row = 0; row < this.gridSize; row++) {
                var reversed = this.grid[row].slice().reverse();
                var result = this.moveLine(reversed);
                if (result.moved) moved = true;
                totalScore += result.scoreGained;
                result.mergedPositions.forEach(function(idx) { mergedCells.push({ row: row, col: this.gridSize - 1 - idx }); }.bind(this));
                this.grid[row] = result.newLine.reverse();
            }
            if (moved) {
                this.score += totalScore;
                var TileManager = module('TileManager');
                if (TileManager && TileManager.updateTiles) TileManager.updateTiles(this.grid, this.gridSize, mergedCells);
                this.updateScoreDisplay();
                this.showFloatingScore(totalScore);
            }
            return moved;
        },

        /**
         * 单行/列的合并算法：去零 -> 相邻相同合并 -> 右侧补零
         * @param {Array} line 行/列数值数组
         * @returns {Object} 包含 newLine/moved/scoreGained/mergedPositions
         */
        moveLine: function(line) {
            var moved = false, scoreGained = 0;
            var filtered = line.filter(function(v) { return v !== 0; });
            var merged = [];
            var mergedPositions = [];
            var i = 0;
            while (i < filtered.length) {
                if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
                    var mergedValue = filtered[i] * 2;
                    merged.push(mergedValue);
                    scoreGained += mergedValue;
                    mergedPositions.push(merged.length - 1);
                    i += 2;
                } else {
                    merged.push(filtered[i]);
                    i++;
                }
            }
            var newLine = merged.concat(Array(line.length - merged.length).fill(0));
            for (var j = 0; j < line.length; j++) {
                if (line[j] !== newLine[j]) { moved = true; break; }
            }
            if (scoreGained >= 512) this.has512 = true;
            return { newLine: newLine, moved: moved, scoreGained: scoreGained, mergedPositions: mergedPositions };
        },

        /**
         * 检查是否首次达到 2048
         */
        checkWinCondition: function() {
            if (this.hasWon) return;
            for (var r = 0; r < this.gridSize; r++) {
                for (var c = 0; c < this.gridSize; c++) {
                    if (this.grid[r][c] === 2048) {
                        this.hasWon = true;
                        this.showWinModal();
                        return;
                    }
                }
            }
        },

        /**
         * 显示胜利弹窗
         */
        showWinModal: function() {
            var winModal = document.getElementById('win-modal');
            if (winModal) winModal.classList.add('active');
        },

        /**
         * 检查是否还能移动：有空格 -> true；相邻有相同数值 -> true；否则 false
         * @returns {boolean} 是否仍可移动
         */
        canMove: function() {
            if (this.getEmptyCells().length > 0) return true;
            for (var r = 0; r < this.gridSize; r++) {
                for (var c = 0; c < this.gridSize; c++) {
                    var val = this.grid[r][c];
                    if (c < this.gridSize - 1 && this.grid[r][c + 1] === val) return true;
                    if (r < this.gridSize - 1 && this.grid[r + 1][c] === val) return true;
                }
            }
            return false;
        },

        /**
         * 切换网格大小（4/5），并重新开始一局
         * @param {number} size 网格大小
         */
        setGridSize: function(size) {
            if (size !== 4 && size !== 5) return;
            this.gridSize = size;
            var TileManager = module('TileManager');
            if (TileManager && TileManager.setGridSize) TileManager.setGridSize(size);
            this.newGame();
        },

        /**
         * 设置动画速度（毫秒）
         * @param {number} speed 动画速度（毫秒）
         */
        setAnimationSpeed: function(speed) {
            this.animationSpeed = speed;
        },

        /**
         * 游戏结束处理：弹窗、保存到排行榜、刷新成就
         */
        gameOver: function() {
            this.isGameOver = true;
            var duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
            var finalScoreEl = document.getElementById('final-score');
            if (finalScoreEl) finalScoreEl.textContent = this.score;

            var Leaderboard = module('Leaderboard');
            var Storage = module('Storage');
            var playerName = (Storage && Storage.load)
                ? Storage.load('player-name', '玩家')
                : (this.playerName || '玩家');
            if (Leaderboard && Leaderboard.save) {
                Leaderboard.save({
                    score: this.score,
                    gridSize: this.gridSize,
                    duration: duration,
                    name: playerName,
                    date: new Date().toLocaleString('zh-CN')
                });
            } else {
                this.saveScoreToLeaderboardLegacy(playerName);
            }

            var Achievements = module('Achievements');
            if (Achievements && Achievements.check) Achievements.check(this);

            var overModal = document.getElementById('gameover-modal');
            if (overModal) overModal.classList.add('active');
        },

        /**
         * 回退方案：直接写入 localStorage 的排行榜（当 Leaderboard 模块不可用时）
         * @param {string} [playerName] 玩家昵称
         */
        saveScoreToLeaderboardLegacy: function(playerName) {
            var STORAGE_KEY = '2048-leaderboard';
            var leaderboard = [];
            try {
                var saved = localStorage.getItem(STORAGE_KEY);
                leaderboard = saved ? JSON.parse(saved) : [];
            } catch (e) {
                leaderboard = [];
            }
            var duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
            leaderboard.push({
                score: this.score,
                gridSize: this.gridSize,
                duration: duration,
                name: playerName || this.playerName || '玩家',
                date: new Date().toLocaleString('zh-CN')
            });
            leaderboard.sort(function(a, b) { return b.score - a.score; });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard.slice(0, 10)));
        },

        /**
         * 更新分数 UI 显示，带弹跳动画；自动同步最高分
         */
        updateScoreDisplay: function() {
            var currentScoreEl = document.getElementById('current-score');
            var bestScoreEl = document.getElementById('best-score');
            if (currentScoreEl) {
                var scoreStr = String(this.score);
                if (currentScoreEl.textContent !== scoreStr) {
                    currentScoreEl.textContent = scoreStr;
                    this.animateScore(currentScoreEl);
                }
            }
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                this.saveBestScore();
            }
            if (bestScoreEl) bestScoreEl.textContent = this.bestScore;
        },

        /**
         * 在分数框上方显示飘字加分效果（+分数）
         * @param {number} score 本次得分
         */
        showFloatingScore: function(score) {
            if (score <= 0) return;
            var floating = document.createElement('div');
            floating.className = 'floating-score';
            floating.textContent = '+' + score;
            var scoreBox = document.querySelector('.score-box');
            if (scoreBox) {
                var rect = scoreBox.getBoundingClientRect();
                floating.style.left = (rect.left + rect.width / 2) + 'px';
                floating.style.top = rect.top + 'px';
            }
            document.body.appendChild(floating);
            floating.addEventListener('animationend', function() { floating.remove(); });
        },

        /**
         * 给指定元素添加弹跳动画（pop）
         * @param {HTMLElement} element 需要动画的 DOM 元素
         */
        animateScore: function(element) {
            element.classList.remove('pop');
            void element.offsetWidth;
            element.classList.add('pop');
        },

        /**
         * 初始化键盘 / 触屏 / 按钮 / 下拉等事件监听
         */
        setupEventListeners: function() {
            var self = this;

            document.addEventListener('keydown', function(e) {
                if (e.key === 'p' || e.key === 'P') { self.togglePause(); return; }
                var keyMap = {
                    'ArrowUp': 'up',    'ArrowDown': 'down',
                    'ArrowLeft': 'left', 'ArrowRight': 'right',
                    'w': 'up', 'W': 'up',
                    's': 'down', 'S': 'down',
                    'a': 'left', 'A': 'left',
                    'd': 'right', 'D': 'right'
                };
                var direction = keyMap[e.key];
                if (direction) { e.preventDefault(); self.move(direction); }
            });

            this.setupTouchEvent();

            var bindClick = function(id, handler) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('click', handler);
            };
            bindClick('new-game-btn', function() { self.newGame(); });
            bindClick('pause-btn', function() { self.togglePause(); });
            bindClick('leaderboard-btn', function() { self.showLeaderboard(); });
            bindClick('achievement-btn', function() {
                var Achievements = module('Achievements');
                if (Achievements && Achievements.show) Achievements.show();
            });
            bindClick('continue-btn', function() {
                self.continueAfterWin();
            });
            bindClick('restart-btn-win', function() { self.newGame(); });
            bindClick('restart-btn-lose', function() { self.newGame(); });
            bindClick('close-leaderboard', function() { self.hideLeaderboard(); });
            bindClick('close-leaderboard-btn', function() { self.hideLeaderboard(); });

            var gridSizeSelect = document.getElementById('grid-size');
            var speedSelect = document.getElementById('game-speed');
            var themeSelect = document.getElementById('theme-select');
            if (gridSizeSelect) gridSizeSelect.addEventListener('change', function(e) { self.setGridSize(parseInt(e.target.value)); });
            if (speedSelect) speedSelect.addEventListener('change', function(e) { self.setAnimationSpeed(parseInt(e.target.value)); });
            if (themeSelect) themeSelect.addEventListener('change', function(e) { self.applyTheme(e.target.value); });
        },

        /**
         * 绑定触屏滑动手势（上下左右）
         */
        setupTouchEvent: function() {
            var gameBoard = document.getElementById('game-board');
            if (!gameBoard) return;
            var startX = 0, startY = 0;
            var self = this;
            gameBoard.addEventListener('touchstart', function(e) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }, { passive: true });
            gameBoard.addEventListener('touchend', function(e) {
                var deltaX = e.changedTouches[0].clientX - startX;
                var deltaY = e.changedTouches[0].clientY - startY;
                var minSwipeDistance = 30;
                if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) return;
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (deltaX > 0) self.move('right');
                    else self.move('left');
                } else {
                    if (deltaY > 0) self.move('down');
                    else self.move('up');
                }
            }, { passive: true });
        },

        /**
         * 显示排行榜弹窗（委托给 Leaderboard 模块，否则回退到本地实现）
         */
        showLeaderboard: function() {
            var Leaderboard = module('Leaderboard');
            if (Leaderboard && Leaderboard.show) {
                Leaderboard.show();
                return;
            }
            var leaderboardModal = document.getElementById('leaderboard-modal');
            var leaderboardList = document.getElementById('leaderboard-list');
            var bestScoreEl = document.getElementById('leaderboard-best-score');
            if (!leaderboardModal || !leaderboardList) return;
            var leaderboard = [];
            try {
                var saved = localStorage.getItem('2048-leaderboard');
                leaderboard = saved ? JSON.parse(saved) : [];
            } catch (e) {
                leaderboard = [];
            }
            leaderboardList.innerHTML = '';
            if (leaderboard.length === 0) {
                leaderboardList.innerHTML = '<li class="empty-record">暂无游戏记录</li>';
            } else {
                if (bestScoreEl) bestScoreEl.textContent = leaderboard[0].score;
                leaderboard.forEach(function(record, index) {
                    var li = document.createElement('li');
                    li.className = 'leaderboard-item';
                    li.innerHTML =
                        '<span class="rank ' + (index < 3 ? 'top-rank' : '') + '">' + (index + 1) + '</span>' +
                        '<span class="record-score">' + record.score + '</span>' +
                        '<span class="record-date">' + record.date + '</span>' +
                        '<span class="record-grid">' + record.gridSize + '\u00d7' + record.gridSize + '</span>';
                    leaderboardList.appendChild(li);
                });
            }
            leaderboardModal.classList.add('active');
        },

        /**
         * 隐藏排行榜弹窗
         */
        hideLeaderboard: function() {
            var leaderboardModal = document.getElementById('leaderboard-modal');
            if (leaderboardModal) leaderboardModal.classList.remove('active');
        },

        /**
         * 达到 2048 后继续游戏（仅关闭胜利弹窗，允许继续合成更大数字）
         */
        continueAfterWin: function() {
            var winModal = document.getElementById('win-modal');
            if (winModal) winModal.classList.remove('active');
        }
    };

    global.Game2048.Game = Game;
})(window);