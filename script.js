/**
 * 2048 游戏核心逻辑
 */

const Game = {
    grid: [],
    score: 0,
    bestScore: 0,
    isAnimating: false,
    hasWon: false,
    isGameOver: false,

    init() {
        this.loadBestScore();
        this.setupEventListeners();
        this.newGame();
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
        this.grid = Array(4).fill(null).map(() => Array(4).fill(0));
        this.score = 0;
        this.hasWon = false;
        this.isGameOver = false;
        this.isAnimating = false;
        TileManager.clearAllTiles();
        this.hideModals();
        this.addRandomTile();
        this.addRandomTile();
        this.updateScoreDisplay();
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
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.grid[r][c] === 0) {
                    empty.push({ row: r, col: c });
                }
            }
        }
        return empty;
    },

    move(direction) {
        if (this.isAnimating || this.isGameOver) return;
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
            }, 150);
        }
    },

    moveUp() {
        let moved = false;
        for (let col = 0; col < 4; col++) {
            const column = [];
            for (let row = 0; row < 4; row++) {
                if (this.grid[row][col] !== 0) column.push(this.grid[row][col]);
            }
            const merged = this.mergeLine(column);
            for (let row = 0; row < 4; row++) {
                const newValue = merged[row] || 0;
                if (this.grid[row][col] !== newValue) moved = true;
                this.grid[row][col] = newValue;
            }
            this.score += this.getMergeScore(merged);
        }
        if (moved) {
            TileManager.updateTiles(this.grid);
            this.updateScoreDisplay();
        }
        return moved;
    },

    moveDown() {
        let moved = false;
        for (let col = 0; col < 4; col++) {
            const column = [];
            for (let row = 3; row >= 0; row--) {
                if (this.grid[row][col] !== 0) column.push(this.grid[row][col]);
            }
            const merged = this.mergeLine(column);
            for (let row = 3, i = 0; row >= 0; row--, i++) {
                const newValue = merged[i] || 0;
                if (this.grid[row][col] !== newValue) moved = true;
                this.grid[row][col] = newValue;
            }
            this.score += this.getMergeScore(merged);
        }
        if (moved) {
            TileManager.updateTiles(this.grid);
            this.updateScoreDisplay();
        }
        return moved;
    },

    moveLeft() {
        let moved = false;
        for (let row = 0; row < 4; row++) {
            const line = this.grid[row].filter(v => v !== 0);
            const merged = this.mergeLine(line);
            for (let col = 0; col < 4; col++) {
                const newValue = merged[col] || 0;
                if (this.grid[row][col] !== newValue) moved = true;
                this.grid[row][col] = newValue;
            }
            this.score += this.getMergeScore(merged);
        }
        if (moved) {
            TileManager.updateTiles(this.grid);
            this.updateScoreDisplay();
        }
        return moved;
    },

    moveRight() {
        let moved = false;
        for (let row = 0; row < 4; row++) {
            const line = [];
            for (let col = 3; col >= 0; col--) {
                if (this.grid[row][col] !== 0) line.push(this.grid[row][col]);
            }
            const merged = this.mergeLine(line);
            for (let col = 3, i = 0; col >= 0; col--, i++) {
                const newValue = merged[i] || 0;
                if (this.grid[row][col] !== newValue) moved = true;
                this.grid[row][col] = newValue;
            }
            this.score += this.getMergeScore(merged);
        }
        if (moved) {
            TileManager.updateTiles(this.grid);
            this.updateScoreDisplay();
        }
        return moved;
    },

    mergeLine(line) {
        const result = [];
        let i = 0;
        while (i < line.length) {
            if (i + 1 < line.length && line[i] === line[i + 1]) {
                result.push(line[i] * 2);
                i += 2;
            } else {
                result.push(line[i]);
                i++;
            }
        }
        return result;
    },

    getMergeScore(merged) {
        let score = 0;
        for (let i = 1; i < merged.length; i++) {
            if (merged[i] === merged[i - 1] * 2) score += merged[i];
        }
        return score;
    },

    checkWinCondition() {
        if (this.hasWon) return;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
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
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const val = this.grid[r][c];
                if (c < 3 && this.grid[r][c + 1] === val) return true;
                if (r < 3 && this.grid[r + 1][c] === val) return true;
            }
        }
        return false;
    },

    gameOver() {
        this.isGameOver = true;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('gameover-modal').classList.add('active');
    },

    updateScoreDisplay() {
        const currentScoreEl = document.getElementById('current-score');
        const bestScoreEl = document.getElementById('best-score');
        if (currentScoreEl.textContent !== this.score.toString()) {
            currentScoreEl.textContent = this.score;
            this.animateScore(currentScoreEl);
        }
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }
        bestScoreEl.textContent = this.bestScore;
    },

    animateScore(element) {
        element.classList.remove('pop');
        void element.offsetWidth;
        element.classList.add('pop');
    },

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            const keyMap = {
                'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
                'w': 'up', 'W': 'up', 's': 'down', 'S': 'down', 'a': 'left', 'A': 'left', 'd': 'right', 'D': 'right'
            };
            const direction = keyMap[e.key];
            if (direction) {
                e.preventDefault();
                this.move(direction);
            }
        });
        this.setupTouchEvent();
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('continue-btn').addEventListener('click', () => {
            document.getElementById('win-modal').classList.remove('active');
        });
        document.getElementById('restart-btn-win').addEventListener('click', () => this.newGame());
        document.getElementById('restart-btn-lose').addEventListener('click', () => this.newGame());
    },

    setupTouchEvent() {
        const gameBoard = document.getElementById('game-board');
        let startX = 0, startY = 0;
        gameBoard.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        gameBoard.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const minSwipeDistance = 30;
            if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) return;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) this.move('right');
                else this.move('left');
            } else {
                if (deltaY > 0) this.move('down');
                else this.move('up');
            }
        }, { passive: true });
    }
};

const TileManager = {
    container: null,
    tiles: [],

    init() {
        this.container = document.getElementById('tiles-container');
    },

    createTile(row, col, value, isNew = false) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value > 2048 ? 'super' : value}`;
        if (isNew) tile.classList.add('tile-new');
        if (value === 2048) tile.classList.add('tile-2048');
        tile.textContent = value;
        tile.dataset.row = row;
        tile.dataset.col = col;
        this.setTilePosition(tile, row, col);
        this.container.appendChild(tile);
        this.tiles.push(tile);
        return tile;
    },

    setTilePosition(tile, row, col) {
        const gap = 12;
        const totalGap = gap * 3;
        const cellWidth = `calc((100% - ${totalGap}px) / 4)`;
        const cellHeight = `calc((100% - ${totalGap}px) / 4)`;
        tile.style.left = `calc(${col} * (${cellWidth} + ${gap}px))`;
        tile.style.top = `calc(${row} * (${cellHeight} + ${gap}px))`;
    },

    updateTiles(grid) {
        this.clearAllTiles();
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] !== 0) this.createTile(r, c, grid[r][c], false);
            }
        }
    },

    clearAllTiles() {
        this.container.innerHTML = '';
        this.tiles = [];
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TileManager.init();
    Game.init();
});