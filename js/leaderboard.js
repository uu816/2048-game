/**
 * 2048 游戏排行榜系统
 *
 * 使用 IIFE 风格，将模块挂载到 window.Game2048.Leaderboard 对象上。
 * 负责排行榜记录的保存、读取、排序、渲染与展示。
 *
 * 依赖：
 *   - window.Game2048.Storage (save / load / remove)
 */
(function () {
    'use strict';

    // 确保命名空间存在
    window.Game2048 = window.Game2048 || {};

    /**
     * @type {string}
     * @description 排行榜持久化存储的 Key
     */
    var STORAGE_KEY = '2048-leaderboard';

    /**
     * @type {string}
     * @description 排序偏好存储的 Key
     */
    var SORT_KEY = '2048-lb-sort';

    /**
     * @namespace Leaderboard
     * @memberof window.Game2048
     * @description 2048 游戏排行榜对象
     */
    window.Game2048.Leaderboard = {

        /**
         * 保存记录到排行榜，按分数降序排列，保留 Top 10
         * @param {Object} record - 游戏记录 {score:number, name:string, date:string, gridSize:number, duration:number}
         * @returns {void}
         */
        save: function (record) {
            var records = this.getAll();
            records.push(this.normalizeRecord(record));
            records.sort(function (a, b) { return b.score - a.score; });
            records = records.slice(0, 10);
            this._storeSave(STORAGE_KEY, records);
        },

        /**
         * 获取排行榜所有记录
         * @returns {Array} 排行榜记录数组
         */
        getAll: function () {
            var records = this._storeLoad(STORAGE_KEY, []);
            return Array.isArray(records) ? records.map(this.normalizeRecord) : [];
        },

        /**
         * 清空排行榜
         * @returns {void}
         */
        clear: function () {
            this._storeRemove(STORAGE_KEY);
        },

        /**
         * 显示排行榜弹窗，读取排序偏好后渲染
         * @returns {void}
         */
        show: function () {
            var sortPref = this._storeLoad(SORT_KEY, 'score');
            this.render(sortPref);
            var modal = document.getElementById('leaderboard-modal');
            if (modal) modal.classList.add('active');
        },

        /**
         * 隐藏排行榜弹窗
         * @returns {void}
         */
        hide: function () {
            var modal = document.getElementById('leaderboard-modal');
            if (modal) modal.classList.remove('active');
        },

        /**
         * 切换排序方式（'score' | 'date'），保存偏好并重新渲染
         * @param {string} key - 排序字段
         * @returns {void}
         */
        sortBy: function (key) {
            this._storeSave(SORT_KEY, key);
            this.render(key);
        },

        /**
         * 渲染排行榜列表
         * @param {string} sortBy - 排序方式
         * @returns {void}
         */
        render: function (sortBy) {
            var records = this.getAll();
            if (sortBy === 'date') {
                records.sort(function (a, b) {
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                });
            }
            var list = document.getElementById('leaderboard-list');
            var bestScore = document.getElementById('leaderboard-best-score');
            if (!list) return;
            list.innerHTML = '';

            if (records.length === 0) {
                list.innerHTML = '<li class="empty-record">暂无游戏记录</li>';
                if (bestScore) bestScore.textContent = '0';
                return;
            }

            if (bestScore) bestScore.textContent = records[0].score;

            for (var i = 0; i < records.length; i++) {
                var r = records[i];
                var li = document.createElement('li');
                li.className = 'leaderboard-item';

                var rank = document.createElement('span');
                rank.className = 'rank' + (i < 3 ? ' top-rank' : '');
                rank.textContent = String(i + 1);

                var name = document.createElement('span');
                name.className = 'record-name';
                name.textContent = r.name || '玩家';

                var score = document.createElement('span');
                score.className = 'record-score';
                score.textContent = String(r.score);

                var date = document.createElement('span');
                date.className = 'record-date';
                date.textContent = r.date || '';

                var grid = document.createElement('span');
                grid.className = 'record-grid';
                grid.textContent = (r.gridSize || 4) + '\u00d7' + (r.gridSize || 4);

                li.appendChild(rank);
                li.appendChild(name);
                li.appendChild(score);
                li.appendChild(date);
                li.appendChild(grid);
                list.appendChild(li);
            }
        },

        /**
         * 获取玩家昵称输入回调
         * @param {function} callback - 接收昵称的回调函数
         * @returns {void}
         */
        showNameInput: function (callback) {
            var input = document.getElementById('player-name-input');
            var name = (input && input.value) ? input.value.trim() : '';
            if (!name) {
                name = prompt('请输入你的昵称：') || '玩家';
            }
            if (callback) callback(name);
        },

        /**
         * 统一记录字段格式
         * @param {Object} record - 原始记录
         * @returns {Object} 标准化后的记录
         */
        normalizeRecord: function (record) {
            return {
                score: record.score || 0,
                name: record.name || record.playerName || '玩家',
                date: record.date || new Date().toLocaleString('zh-CN'),
                gridSize: record.gridSize || 4,
                duration: record.duration || 0,
                id: record.id || Date.now()
            };
        },

        /**
         * 内部：通过 Storage 模块保存（否则回退 localStorage）
         * @param {string} key - 存储键
         * @param {*} value - 存储值
         */
        _storeSave: function (key, value) {
            var Storage = window.Game2048 && window.Game2048.Storage;
            if (Storage && typeof Storage.save === 'function') {
                Storage.save(key, value);
            } else {
                try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
            }
        },

        /**
         * 内部：通过 Storage 模块读取（否则回退 localStorage）
         * @param {string} key - 存储键
         * @param {*} defaultValue - 默认值
         * @returns {*} 读取的值
         */
        _storeLoad: function (key, defaultValue) {
            var Storage = window.Game2048 && window.Game2048.Storage;
            if (Storage && typeof Storage.load === 'function') {
                return Storage.load(key, defaultValue);
            }
            try {
                var raw = localStorage.getItem(key);
                return raw !== null ? JSON.parse(raw) : defaultValue;
            } catch (e) { return defaultValue; }
        },

        /**
         * 内部：通过 Storage 模块删除（否则回退 localStorage）
         * @param {string} key - 存储键
         */
        _storeRemove: function (key) {
            var Storage = window.Game2048 && window.Game2048.Storage;
            if (Storage && typeof Storage.remove === 'function') {
                Storage.remove(key);
            } else {
                try { localStorage.removeItem(key); } catch (e) {}
            }
        }
    };
})();