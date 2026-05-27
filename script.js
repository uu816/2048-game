/**
 * 2048 游戏核心逻辑模块
 * 包含游戏状态管理、移动逻辑、计分系统等核心功能
 */

const Game = {
    grid: [],
    score: 0,
    bestScore: 0,
    gridSize: 4,
    animationSpeed: 150,
    isAnimating: false,
    isPaused: false,
    hasWon: false,
    isGameOver: false,

    init() {
        this.loadBestScore();
        this.loadTheme();
        this.setupEventListeners();
        this.newGame();
    },

    loadTheme() {
        const savedTheme = localStorage.getItem('2048-theme') || 'fresh';
        this.applyTheme(savedTheme);
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = savedTheme;
    },

    applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'cyber') root.classList.add('theme-cyber');
        else root.classList.remove('theme-cyber');
        localStorage.setItem('2048-theme', theme);
    },

    loadBestScore() {
        const saved = localStorage.getItem('2048-best-score');
        this.bestScore = saved ? parseInt(saved, 10) : 0;
        this.updateScoreDisplay();
    },

    saveBestScore() {
        localStorage.setItem('2048-best-score', this.bestScore.toString());
    },

    newGame() {
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.hasWon = false;
        this.isGameOver = false;
        this.isAnimating = false;
        this.isPaused = false;
        TileManager.clearAllTiles();
        this.hideModals();
        this.updatePauseButton();
        this.addRandomTile();
        this.addRandomTile();
        this.updateScoreDisplay();
    },

    togglePause() {
        this.isPaused = !this.isPaused;
        this.updatePauseButton();
    },

    updatePauseButton() {
        const pauseBtn = document.getElementById('pause-btn');
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseBtn) pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
        if (pauseOverlay) pauseOverlay.style.display = this.isPaused ? 'flex' : 'none';
    },

    hideModals() {
        document.getElementById('win-modal').classList.remove('active');
        document.getElementById('gameover-modal').classList.remove('active');
    },

    addRandomTile() {
        const emptyCells = this.getEmptyCells();
        if (emptyCells.length === 0) return false;
        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        this.grid[row][col] = value;
        TileManager.createTile(row, col, value, true);
        return true;
    },

    getEmptyCells() {
        const empty = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) empty.push({ row: r, col: c });
            }
        }
        return empty;
    },

    move(direction) {
        if (this.isAnimating || this.isGameOver || this.isPaused) return;
        let moved = false;
        switch (direction) {
            case 'up': moved = this.moveUp(); break;
            case 'down': moved = this.moveDown(); break;
            case 'left': moved = this.moveLeft(); break;
            case 'right': moved = this.moveRight(); break;
        }
        if (moved) {
            this.isAnimating = true;
            setTimeout(() => {
                this.addRandomTile();
                this.checkWinCondition();
                if (!this.canMove()) this.gameOver();
                this.isAnimating = false;
            }, this.animationSpeed);
        }
    },

    moveUp() {
        let moved = false, totalScore = 0;
        const mergedCells = [];
        for (let col = 0; col < this.gridSize; col++) {
            const column = [];
            for (let row = 0; row < this.gridSize; row++) column.push(this.grid[row][col]);
            const { newLine, moved: lineMoved, scoreGained, mergedPositions } = this.moveLine(column);
            if (lineMoved) moved = true;
            totalScore += scoreGained;
            mergedPositions.forEach(idx => mergedCells.push({ row: idx, col }));
            for (let row = 0; row < this.gridSize; row++) this.grid[row][col] = newLine[row];
        }
        if (moved) {
            this.score += totalScore;
            TileManager.updateTiles(this.grid, this.gridSize, mergedCells);
            this.updateScoreDisplay();
            this.showFloatingScore(totalScore);
        }
        return moved;
    },

    moveDown() {
        let moved = false, totalScore = 0;
        const mergedCells = [];
        for (let col = 0; col < this.gridSize; col++) {
            const column = [];
            for (let row = this.gridSize - 1; row >= 0; row--) column.push(this.grid[row][col]);
            const { newLine, moved: lineMoved, scoreGained, mergedPositions } = this.moveLine(column);
            if (lineMoved) moved = true;
            totalScore += scoreGained;
            mergedPositions.forEach(idx => mergedCells.push({ row: this.gridSize - 1 - idx, col }));
            for (let row = this.gridSize - 1, i = 0; row >= 0; row--, i++) this.grid[row][col] = newLine[i];
        }
        if (moved) {
            this.score += totalScore;
            TileManager.updateTiles(this.grid, this.gridSize, mergedCells);
            this.updateScoreDisplay();
            this.showFloatingScore(totalScore);
        }
        return moved;
    },

    moveLeft() {
        let moved = false, totalScore = 0;
        const mergedCells = [];
        for (let row = 0; row < this.gridSize; row++) {
            const { newLine, moved: lineMoved, scoreGained, mergedPositions } = this.moveLine(this.grid[row]);
            if (lineMoved) moved = true;
            totalScore += scoreGained;
            mergedPositions.forEach(idx => mergedCells.push({ row, col: idx }));
            this.grid[row] = newLine;
        }
        if (moved) {
            this.score += totalScore;
            TileManager.updateTiles(this.grid, this.gridSize, mergedCells);
            this.updateScoreDisplay();
            this.showFloatingScore(totalScore);
        }
        return moved;
    },

    moveRight() {
        let moved = false, totalScore = 0;
        const mergedCells = [];
        for (let row = 0; row < this.gridSize; row++) {
            const reversed = [...this.grid[row]].reverse();
            const { newLine, moved: lineMoved, scoreGained, mergedPositions } = this.moveLine(reversed);
            if (lineMoved) moved = true;
            totalScore += scoreGained;
            mergedPositions.forEach(idx => mergedCells.push({ row, col: this.gridSize - 1 - idx }));
            this.grid[row] = newLine.reverse();
        }
        if (moved) {
            this.score += totalScore;
            TileManager.updateTiles(this.grid, this.gridSize, mergedCells);
            this.updateScoreDisplay();
            this.showFloatingScore(totalScore);
        }
        return moved;
    },

    moveLine(line) {
        let moved = false, scoreGained = 0;
        const filtered = line.filter(v => v !== 0);
        const merged = [], mergedPositions = [];
        let i = 0;
        while (i < filtered.length) {
            if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
                const mergedValue = filtered[i] * 2;
                merged.push(mergedValue);
                scoreGained += mergedValue;
                mergedPositions.push(merged.length - 1);
                i += 2;
            } else {
                merged.push(filtered[i]);
                i++;
            }
        }
        const newLine = merged.concat(Array(line.length - merged.length).fill(0));
        for (let j = 0; j < line.length; j++) {
            if (line[j] !== newLine[j]) { moved = true; break; }
        }
        return { newLine, moved, scoreGained, mergedPositions };
    },

    checkWinCondition() {
        if (this.hasWon) return;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 2048) {
                    this.hasWon = true;
                    this.showWinModal();
                    return;
                }
            }
        }
    },

    showWinModal() {
        document.getElementById('win-modal').classList.add('active');
    },

    canMove() {
        if (this.getEmptyCells().length > 0) return true;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const val = this.grid[r][c];
                if (c < this.gridSize - 1 && this.grid[r][c + 1] === val) return true;
                if (r < this.gridSize - 1 && this.grid[r + 1][c] === val) return true;
            }
        }
        return false;
    },

    setGridSize(size) {
        if (size !== 4 && size !== 5) return;
        this.gridSize = size;
        TileManager.setGridSize(size);
        this.newGame();
    },

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    },

    gameOver() {
        this.isGameOver = true;
        document.getElementById('final-score').textContent = this.score;
        this.saveScoreToLeaderboard();
        document.getElementById('gameover-modal').classList.add('active');
    },

    saveScoreToLeaderboard() {
        const leaderboard = this.getLeaderboard();
        const newRecord = { score: this.score, date: new Date().toLocaleString('zh-CN'), gridSize: this.gridSize, id: Date.now() };
        leaderboard.push(newRecord);
        leaderboard.sort((a, b) => b.score - a.score);
        localStorage.setItem('2048-leaderboard', JSON.stringify(leaderboard.slice(0, 10)));
    },

    getLeaderboard() {
        const saved = localStorage.getItem('2048-leaderboard');
        if (!saved) return [];
        try { return JSON.parse(saved); }
        catch (e) { console.error('排行榜数据解析失败:', e); return []; }
    },

    showLeaderboard() {
        const leaderboard = this.getLeaderboard();
        const leaderboardModal = document.getElementById('leaderboard-modal');
        const leaderboardList = document.getElementById('leaderboard-list');
        const bestScoreEl = document.getElementById('leaderboard-best-score');
        leaderboardList.innerHTML = '';
        if (leaderboard.length === 0) {
            leaderboardList.innerHTML = '<li class="empty-record">暂无游戏记录</li>';
        } else {
            bestScoreEl.textContent = leaderboard[0].score;
            leaderboard.forEach((record, index) => {
                const li = document.createElement('li');
                li.className = 'leaderboard-item';
                li.innerHTML = `<span class="rank ${index < 3 ? 'top-rank' : ''}">${index + 1}</span><span class="record-score">${record.score}</span><span class="record-date">${record.date}</span><span class="record-grid">${record.gridSize}×${record.gridSize}</span>`;
                leaderboardList.appendChild(li);
            });
        }
        leaderboardModal.classList.add('active');
    },

    hideLeaderboard() {
        document.getElementById('leaderboard-modal').classList.remove('active');
    },

    updateScoreDisplay() {
        const currentScoreEl = document.getElementById('current-score');
        const bestScoreEl = document.getElementById('best-score');
        if (currentScoreEl.textContent !== this.score.toString()) {
            currentScoreEl.textContent = this.score;
            this.animateScore(currentScoreEl);
        }
        if (this.score > this.bestScore) { this.bestScore = this.score; this.saveBestScore(); }
        bestScoreEl.textContent = this.bestScore;
    },

    showFloatingScore(score) {
        if (score <= 0) return;
        const floating = document.createElement('div');
        floating.className = 'floating-score';
        floating.textContent = `+${score}`;
        const scoreBox = document.querySelector('.score-box');
        if (scoreBox) {
            const rect = scoreBox.getBoundingClientRect();
            floating.style.left = `${rect.left + rect.width / 2}px`;
            floating.style.top = `${rect.top}px`;
        }
        document.body.appendChild(floating);
        floating.addEventListener('animationend', () => floating.remove());
    },

    animateScore(element) {
        element.classList.remove('pop');
        void element.offsetWidth;
        element.classList.add('pop');
    },

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') { this.togglePause(); return; }
            const keyMap = { 'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right', 'w': 'up', 'W': 'up', 's': 'down', 'S': 'down', 'a': 'left', 'A': 'left', 'd': 'right', 'D': 'right' };
            const direction = keyMap[e.key];
            if (direction) { e.preventDefault(); this.move(direction); }
        });
        this.setupTouchEvent();
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('leaderboard-btn').addEventListener('click', () => this.showLeaderboard());
        document.getElementById('continue-btn').addEventListener('click', () => document.getElementById('win-modal').classList.remove('active'));
        document.getElementById('restart-btn-win').addEventListener('click', () => this.newGame());
        document.getElementById('restart-btn-lose').addEventListener('click', () => this.newGame());
        document.getElementById('close-leaderboard').addEventListener('click', () => this.hideLeaderboard());
        document.getElementById('close-leaderboard-btn').addEventListener('click', () => this.hideLeaderboard());
        const gridSizeSelect = document.getElementById('grid-size');
        const speedSelect = document.getElementById('game-speed');
        const themeSelect = document.getElementById('theme-select');
        if (gridSizeSelect) gridSizeSelect.addEventListener('change', (e) => this.setGridSize(parseInt(e.target.value)));
        if (speedSelect) speedSelect.addEventListener('change', (e) => this.setAnimationSpeed(parseInt(e.target.value)));
        if (themeSelect) themeSelect.addEventListener('change', (e) => this.applyTheme(e.target.value));
    },

    setupTouchEvent() {
        const gameBoard = document.getElementById('game-board');
        let startX = 0, startY = 0;
        gameBoard.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
        gameBoard.addEventListener('touchend', (e) => {
            const deltaX = e.changedTouches[0].clientX - startX;
            const deltaY = e.changedTouches[0].clientY - startY;
            const minSwipeDistance = 30;
            if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) return;
            if (Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX > 0) this.move('right'); else this.move('left'); }
            else { if (deltaY > 0) this.move('down'); else this.move('up'); }
        }, { passive: true });
    }
};

const TileManager = {
    container: null, tiles: [], gridSize: 4, gap: 12,

    init() { this.container = document.getElementById('tiles-container'); },

    setGridSize(size) { this.gridSize = size; this.gap = size === 4 ? 12 : 8; this.updateBoardStyle(); },

    updateBoardStyle() {
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) {
            gameBoard.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
            gameBoard.style.gridTemplateRows = `repeat(${this.gridSize}, 1fr)`;
            gameBoard.style.gap = `${this.gap}px`;
            gameBoard.style.padding = `${this.gap}px`;
        }
        const tilesContainer = document.getElementById('tiles-container');
        if (tilesContainer) {
            tilesContainer.style.top = `${this.gap}px`; tilesContainer.style.left = `${this.gap}px`;
            tilesContainer.style.right = `${this.gap}px`; tilesContainer.style.bottom = `${this.gap}px`;
        }
    },

    createTile(row, col, value, isNew = false) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value > 2048 ? 'super' : value}`;
        if (isNew) tile.classList.add('tile-new');
        if (value === 2048) tile.classList.add('tile-2048');
        tile.textContent = value;
        tile.dataset.row = row; tile.dataset.col = col;
        this.setTilePosition(tile, row, col);
        this.container.appendChild(tile);
        this.tiles.push(tile);
        return tile;
    },

    setTilePosition(tile, row, col) {
        const totalGap = this.gap * (this.gridSize - 1);
        const cellWidth = `calc((100% - ${totalGap}px) / ${this.gridSize})`;
        const cellHeight = `calc((100% - ${totalGap}px) / ${this.gridSize})`;
        tile.style.left = `calc(${col} * (${cellWidth} + ${this.gap}px))`;
        tile.style.top = `calc(${row} * (${cellHeight} + ${this.gap}px))`;
        tile.style.width = cellWidth; tile.style.height = cellHeight;
        tile.style.fontSize = this.getFontSize(parseInt(tile.textContent, 10));
    },

    getFontSize(value) {
        if (this.gridSize === 4) {
            if (value > 2048) return '36px';
            if (value >= 1024) return '40px';
            if (value >= 128) return '45px';
            if (value >= 16) return '47px';
            return '48px';
        } else {
            if (value > 2048) return '20px';
            if (value >= 1024) return '24px';
            if (value >= 128) return '28px';
            if (value >= 16) return '30px';
            return '32px';
        }
    },

    updateTiles(grid, size = 4, mergedCells = []) {
        this.gridSize = size; this.gap = size === 4 ? 12 : 8;
        this.updateBoardStyle(); this.clearAllTiles();
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] !== 0) {
                    const tile = this.createTile(r, c, grid[r][c], false);
                    if (mergedCells.some(cell => cell.row === r && cell.col === c)) {
                        tile.classList.add('tile-merged');
                        tile.classList.add('tile-merged-glow');
                    }
                }
            }
        }
    },

    clearAllTiles() { this.container.innerHTML = ''; this.tiles = []; }
};

document.addEventListener('DOMContentLoaded', () => { TileManager.init(); Game.init(); });