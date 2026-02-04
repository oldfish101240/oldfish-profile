// ============================================
// 內容過濾器系統（伺服器端配置）
// ============================================

const ContentFilter = {
    STORAGE_KEY: 'contentFilters',
    FILTER_ENABLED_KEY: 'filterEnabled',
    FILTER_STATS_KEY: 'filterStats',
    BLOCKED_LOG_KEY: 'blockedMessages',
    MAX_BLOCKED_LOGS: 200,
    CONFIG_CACHE_KEY: 'filterConfigCache',
    CONFIG_CACHE_TIME: 5 * 60 * 1000, // 5分鐘緩存
    API_ENDPOINT: 'https://oldfish-profile.vercel.app/api/get-config',
    
    // 配置緩存
    _configCache: null,
    _configCacheTime: null,
    
    // 初始化
    init() {
        this.ensureStorage();
        // 異步載入伺服器配置
        this.loadServerConfig();
    },
    
    // 確保存儲結構存在（僅用於統計和本地日誌）
    ensureStorage() {
        // 初始化過濾統計
        if (!localStorage.getItem(this.FILTER_STATS_KEY)) {
            localStorage.setItem(this.FILTER_STATS_KEY, JSON.stringify({
                totalBlocked: 0,
                blockedByCategory: {},
                lastBlocked: null
            }));
        }

        // 初始化攔截內容記錄
        if (!localStorage.getItem(this.BLOCKED_LOG_KEY)) {
            localStorage.setItem(this.BLOCKED_LOG_KEY, JSON.stringify([]));
        }
    },
    
    // 從伺服器載入配置
    async loadServerConfig() {
        try {
            // 檢查緩存
            const cached = localStorage.getItem(this.CONFIG_CACHE_KEY);
            const cacheTime = localStorage.getItem(this.CONFIG_CACHE_KEY + '_time');
            
            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age < this.CONFIG_CACHE_TIME) {
                    this._configCache = JSON.parse(cached);
                    this._configCacheTime = parseInt(cacheTime);
                    return;
                }
            }
            
            // 從 API 載入
            const response = await fetch(this.API_ENDPOINT);
            if (!response.ok) throw new Error('Failed to fetch config');
            
            const data = await response.json();
            if (data.success && data.config) {
                this._configCache = data.config;
                this._configCacheTime = Date.now();
                
                // 更新緩存
                localStorage.setItem(this.CONFIG_CACHE_KEY, JSON.stringify(data.config));
                localStorage.setItem(this.CONFIG_CACHE_KEY + '_time', this._configCacheTime.toString());
            }
        } catch (error) {
            console.error('載入伺服器配置失敗:', error);
            // 使用緩存或預設值
            const cached = localStorage.getItem(this.CONFIG_CACHE_KEY);
            if (cached) {
                this._configCache = JSON.parse(cached);
            }
        }
    },
    
    // 獲取當前配置（同步，使用緩存）
    getConfig() {
        if (this._configCache) {
            return this._configCache;
        }
        
        // 嘗試從緩存讀取
        const cached = localStorage.getItem(this.CONFIG_CACHE_KEY);
        if (cached) {
            this._configCache = JSON.parse(cached);
            return this._configCache;
        }
        
        // 返回預設配置
        return {
            whisperEnabled: true,
            filterEnabled: true,
            filters: [
                { id: 1, word: '垃圾', category: 'spam', enabled: true },
                { id: 2, word: '廣告', category: 'spam', enabled: true },
                { id: 3, word: '詐騙', category: 'fraud', enabled: true }
            ]
        };
    },
    
    // 獲取過濾詞列表（從伺服器配置）
    getFilters() {
        const config = this.getConfig();
        return Array.isArray(config.filters) ? config.filters : [];
    },
    
    // 檢查過濾器是否啟用（從伺服器配置）
    isEnabled() {
        const config = this.getConfig();
        return config.filterEnabled !== false;
    },
    
    // 檢測文本中的過濾詞
    detect(text) {
        if (!this.isEnabled()) {
            return { detected: false, matches: [] };
        }
        
        const filters = this.getFilters().filter(f => f.enabled);
        const matches = [];
        const lowerText = text.toLowerCase();
        
        filters.forEach(filter => {
            const filterWord = filter.word.toLowerCase();
            
            // 支援部分匹配
            if (lowerText.includes(filterWord)) {
                matches.push({
                    word: filter.word,
                    category: filter.category,
                    originalWord: filter.word
                });
            }
            
            // 支援正則表達式（如果過濾詞以 / 開頭和結尾）
            if (filterWord.startsWith('/') && filterWord.endsWith('/')) {
                try {
                    const regex = new RegExp(filterWord.slice(1, -1), 'gi');
                    if (regex.test(text)) {
                        matches.push({
                            word: filter.word,
                            category: filter.category,
                            originalWord: filter.word,
                            isRegex: true
                        });
                    }
                } catch (error) {
                    console.warn('過濾詞正則表達式錯誤:', filter.word, error);
                }
            }
        });
        
        return {
            detected: matches.length > 0,
            matches: matches
        };
    },
    
    // 記錄過濾統計
    recordBlock(category) {
        try {
            const stats = JSON.parse(localStorage.getItem(this.FILTER_STATS_KEY) || '{}');
            stats.totalBlocked = (stats.totalBlocked || 0) + 1;
            stats.blockedByCategory = stats.blockedByCategory || {};
            stats.blockedByCategory[category] = (stats.blockedByCategory[category] || 0) + 1;
            stats.lastBlocked = new Date().toISOString();
            localStorage.setItem(this.FILTER_STATS_KEY, JSON.stringify(stats));
        } catch (error) {
            console.error('記錄過濾統計失敗:', error);
        }
    },

    // 記錄被攔截的內容（供 admin 查看）
    logBlockedContent(entry) {
        try {
            const raw = localStorage.getItem(this.BLOCKED_LOG_KEY);
            let logs = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(logs)) logs = [];

            const safeEntry = {
                id: Date.now() + Math.random(),
                timestamp: new Date().toISOString(),
                page: entry?.page || '/',
                name: entry?.name || '',
                message: entry?.message || '',
                matches: Array.isArray(entry?.matches) ? entry.matches.map(m => ({
                    word: m.word,
                    category: m.category || 'general'
                })) : []
            };

            logs.unshift(safeEntry);
            if (logs.length > this.MAX_BLOCKED_LOGS) {
                logs = logs.slice(0, this.MAX_BLOCKED_LOGS);
            }
            localStorage.setItem(this.BLOCKED_LOG_KEY, JSON.stringify(logs));
        } catch (error) {
            console.error('保存攔截內容失敗:', error);
        }
    },

    getBlockedLogs() {
        try {
            const raw = localStorage.getItem(this.BLOCKED_LOG_KEY);
            const logs = raw ? JSON.parse(raw) : [];
            return Array.isArray(logs) ? logs : [];
        } catch (error) {
            return [];
        }
    },

    clearBlockedLogs() {
        localStorage.setItem(this.BLOCKED_LOG_KEY, JSON.stringify([]));
    },
    
    // 獲取過濾統計
    getStats() {
        try {
            const stats = localStorage.getItem(this.FILTER_STATS_KEY);
            return stats ? JSON.parse(stats) : {
                totalBlocked: 0,
                blockedByCategory: {},
                lastBlocked: null
            };
        } catch (error) {
            return {
                totalBlocked: 0,
                blockedByCategory: {},
                lastBlocked: null
            };
        }
    },
    
    // 重置統計
    resetStats() {
        localStorage.setItem(this.FILTER_STATS_KEY, JSON.stringify({
            totalBlocked: 0,
            blockedByCategory: {},
            lastBlocked: null
        }));
    },
    
    // 清除配置緩存（強制重新載入）
    clearCache() {
        this._configCache = null;
        this._configCacheTime = null;
        localStorage.removeItem(this.CONFIG_CACHE_KEY);
        localStorage.removeItem(this.CONFIG_CACHE_KEY + '_time');
    },
    
    // 強制重新載入配置（清除緩存並重新載入）
    async refreshConfig() {
        this.clearCache();
        await this.loadServerConfig();
    }
};

// 自動初始化
ContentFilter.init();

