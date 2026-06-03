/**
 * 2048 游戏成就系统模块
 *
 * 使用 IIFE 风格，将模块挂载到 window.Game2048.Achievements 对象上。
 * 负责成就定义、解锁条件检查、持久化与展示。
 *
 * 依赖：
 *   - window.Game2048.Storage (save / load)
 *   - window.Game2048.UI (showAchievementUnlock)
 *
 * 若依赖模块不存在，将回退到 localStorage / console.log。
 */
(function () {
    'use strict';

    // 确保命名空间存在
    window.Game2048 = window.Game2048 || {};

    /**
     * @type {string}
     * @description 持久化存储的 Key
     */
    var STORAGE_KEY = '2048-achievements';

    /**
     * @type {Array}
     * @description 所有成就的定义数组，顺序即为展示顺序
     */
    var DEFINITIONS = [
        {
            id: 'first-win',
            icon: '\ud83c\udfc6',
            name: '首次通关',
            description: '恭喜！你首次合成了 2048！'
        },
        {
            id: 'score-master',
            icon: '\ud83d\udcaf',
            name: '满分挑战',
            description: '单局得分达到 10000 分！'
        },
        {
            id: 'speed-king',
            icon: '\u26a1',
            name: '速度之王',
            description: '30 秒内合成 512！'
        }
    ];

    /**
     * @type {Array}
     * @description 运行时成就状态，每项包含 id / name / icon / description / unlocked / unlockedAt
     */
    var achievements = [];

    /**
     * 将日期对象/时间戳格式化为 "YYYY-MM-DD HH:mm" 字符串
     * @param {Date|number|string} date 日期对象或时间戳
     * @returns {string} 格式化后的日期字符串，无效输入返回空串
     */
    function formatDate(date) {
        if (!date) return '';
        var d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    /**
     * 从 Storage 读取已保存的成就数据（优先使用 Storage.load，否则回退 localStorage）
     * @returns {Object} 解析后的数据对象，若无数据或失败返回空对象
     */
    function loadFromStorage() {
        var Storage = window.Game2048 && window.Game2048.Storage;
        var defaultValue = {};
        if (Storage && typeof Storage.load === 'function') {
            var result = Storage.load(STORAGE_KEY, defaultValue);
            return result && typeof result === 'object' ? result : defaultValue;
        }
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultValue;
            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    /**
     * 将当前成就状态持久化到 Storage（优先使用 Storage.save，否则回退 localStorage）
     * @returns {void}
     */
    function saveToStorage() {
        var data = {};
        achievements.forEach(function (a) {
            data[a.id] = {
                unlocked: a.unlocked,
                unlockedAt: a.unlockedAt || null
            };
        });
        var Storage = window.Game2048 && window.Game2048.Storage;
        if (Storage && typeof Storage.save === 'function') {
            Storage.save(STORAGE_KEY, data);
        } else {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) {
                // 静默失败
            }
        }
    }

    /**
     * 检查 game 对象中是否存在值 >= target 的方块
     * @param {Object} game window.Game2048.Game 对象（包含 grid 二维数组）
     * @param {number} target 目标方块值
     * @returns {boolean} 若存在 >= target 的方块返回 true
     */
    function hasTileValueAtLeast(game, target) {
        if (!game || !game.grid) return false;
        for (var r = 0; r < game.grid.length; r++) {
            var row = game.grid[r];
            if (!row) continue;
            for (var c = 0; c < row.length; c++) {
                if (typeof row[c] === 'number' && row[c] >= target) return true;
            }
        }
        return false;
    }

    /**
     * 检查指定成就是否满足解锁条件
     * @param {Object} achievement 成就定义对象
     * @param {Object} game window.Game2048.Game 对象
     * @returns {boolean} 是否已满足解锁条件
     */
    function checkCondition(achievement, game) {
        if (!game) return false;
        switch (achievement.id) {
            case 'first-win':
                return !!game.hasWon || hasTileValueAtLeast(game, 2048);
            case 'score-master':
                return typeof game.score === 'number' && game.score >= 10000;
            case 'speed-king':
                if (!hasTileValueAtLeast(game, 512)) return false;
                if (!game.startTime) return false;
                var elapsed = (Date.now() - game.startTime) / 1000;
                return typeof elapsed === 'number' && elapsed <= 30;
            default:
                return false;
        }
    }

    /**
     * 初始化成就系统，从 Storage 加载已解锁状态；若没有数据则全部标记为未解锁
     * @returns {void}
     */
    function init() {
        var saved = loadFromStorage();
        achievements = DEFINITIONS.map(function (def) {
            var state = saved && saved[def.id];
            return {
                id: def.id,
                icon: def.icon,
                name: def.name,
                description: def.description,
                unlocked: !!(state && state.unlocked),
                unlockedAt: (state && state.unlockedAt) || null
            };
        });
    }

    /**
     * 遍历未解锁的成就，检查条件，满足则解锁
     * @param {Object} game window.Game2048.Game 对象
     * @returns {void}
     */
    function check(game) {
        for (var i = 0; i < achievements.length; i++) {
            var a = achievements[i];
            if (!a.unlocked && checkCondition(a, game)) {
                unlock(a.id);
            }
        }
    }

    /**
     * 解锁指定成就，记录时间并显示庆祝动画，然后持久化
     * @param {string} id 成就 ID
     * @returns {void}
     */
    function unlock(id) {
        var target = null;
        for (var i = 0; i < achievements.length; i++) {
            if (achievements[i].id === id) {
                target = achievements[i];
                break;
            }
        }
        if (!target || target.unlocked) return;
        target.unlocked = true;
        target.unlockedAt = Date.now();
        saveToStorage();
        var UI = window.Game2048 && window.Game2048.UI;
        if (UI && typeof UI.showAchievementUnlock === 'function') {
            UI.showAchievementUnlock(target);
        } else {
            console.log('[成就解锁] ' + target.icon + ' ' + target.name + ' - ' + target.description);
        }
    }

    /**
     * 返回所有成就对象的数组（副本），包含当前解锁状态
     * @returns {Array} 成就数组，每项包含 id/icon/name/description/unlocked/unlockedAt
     */
    function getAll() {
        return achievements.map(function (a) {
            return {
                id: a.id,
                icon: a.icon,
                name: a.name,
                description: a.description,
                unlocked: a.unlocked,
                unlockedAt: a.unlockedAt
            };
        });
    }

    /**
     * 渲染成就列表到 #achievement-list 容器，并显示 #achievement-modal
     * 已解锁项显示绿色，未解锁项显示灰色/透明。
     * @returns {void}
     */
    function show() {
        var list = document.getElementById('achievement-list');
        var modal = document.getElementById('achievement-modal');
        if (list) {
            list.innerHTML = '';
            achievements.forEach(function (a) {
                var li = document.createElement('li');
                li.className = 'achievement-item' + (a.unlocked ? ' achievement-unlocked' : ' achievement-locked');

                var infoText = a.unlocked
                    ? ('解锁于 ' + formatDate(a.unlockedAt))
                    : a.description;

                li.innerHTML =
                    '<span class="achievement-icon">' + a.icon + '</span>' +
                    '<span class="achievement-info">' +
                        '<span class="achievement-name">' + a.name + '</span>' +
                        '<span class="achievement-desc">' + infoText + '</span>' +
                    '</span>';
                list.appendChild(li);
            });
        }
        if (modal) modal.classList.add('active');
    }

    /**
     * 隐藏成就模态框（#achievement-modal）
     * @returns {void}
     */
    function hide() {
        var modal = document.getElementById('achievement-modal');
        if (modal) modal.classList.remove('active');
    }

    // 对外暴露的 API
    window.Game2048.Achievements = {
        init: init,
        check: check,
        unlock: unlock,
        getAll: getAll,
        show: show,
        hide: hide
    };
})();