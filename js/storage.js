/**
 * 2048 游戏本地存储封装模块，统一管理 localStorage 读写
 *
 * 通过 window.Game2048 命名空间对外暴露 Storage 对象，提供统一的
 * localStorage 读写接口，自动处理 JSON 序列化/反序列化与异常情况。
 */
(function (global) {
    'use strict';

    var PREFIX = '2048-';

    var KEYS = {
        BEST_SCORE: '2048-best-score',
        THEME: '2048-theme',
        LEADERBOARD: '2048-leaderboard',
        ACHIEVEMENTS: '2048-achievements',
        TUTORIAL_SEEN: '2048-tutorial-seen'
    };

    /**
     * @description 判断当前运行环境中 localStorage 是否可用
     * @returns {boolean} 可用返回 true，否则返回 false
     */
    function isAvailable() {
        try {
            var testKey = PREFIX + 'test';
            global.localStorage.setItem(testKey, '1');
            global.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * @description 保存任意值到 localStorage，自动 JSON 序列化
     * @param {string} key - 存储键名
     * @param {*} value - 需要保存的任意值（会被 JSON.stringify 序列化）
     * @returns {boolean} 保存成功返回 true，失败返回 false
     */
    function save(key, value) {
        try {
            if (!isAvailable()) {
                return false;
            }
            var serialized = JSON.stringify(value);
            global.localStorage.setItem(key, serialized);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * @description 从 localStorage 读取数据，自动 JSON 解析，失败返回 defaultValue
     * @param {string} key - 存储键名
     * @param {*} defaultValue - 当读取失败或数据不存在时返回的默认值
     * @returns {*} 解析后的值，读取失败时返回 defaultValue
     */
    function load(key, defaultValue) {
        try {
            if (!isAvailable()) {
                return defaultValue;
            }
            var raw = global.localStorage.getItem(key);
            if (raw === null || raw === undefined) {
                return defaultValue;
            }
            return JSON.parse(raw);
        } catch (e) {
            return defaultValue;
        }
    }

    /**
     * @description 删除指定 key 的数据
     * @param {string} key - 存储键名
     * @returns {boolean} 删除成功返回 true，失败返回 false
     */
    function remove(key) {
        try {
            if (!isAvailable()) {
                return false;
            }
            global.localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * @description 清空所有 2048 相关数据（key 以 '2048-' 开头）
     * @returns {boolean} 清空成功返回 true，失败返回 false
     */
    function clear() {
        try {
            if (!isAvailable()) {
                return false;
            }
            var storage = global.localStorage;
            var keysToRemove = [];
            for (var i = 0; i < storage.length; i++) {
                var k = storage.key(i);
                if (k && k.indexOf(PREFIX) === 0) {
                    keysToRemove.push(k);
                }
            }
            for (var j = 0; j < keysToRemove.length; j++) {
                storage.removeItem(keysToRemove[j]);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    if (!global.Game2048) {
        global.Game2048 = {};
    }

    global.Game2048.Storage = {
        KEYS: KEYS,
        save: save,
        load: load,
        remove: remove,
        clear: clear,
        isAvailable: isAvailable
    };

})(window);