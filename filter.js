// ============================================
// 內容過濾器系統
// ============================================

const ContentFilter = {
    STORAGE_KEY: 'contentFilters',
    FILTER_ENABLED_KEY: 'filterEnabled',
    FILTER_STATS_KEY: 'filterStats',
    
    // 初始化
    init() {
        this.ensureStorage();
    },
    
    // 確保存儲結構存在
    ensureStorage() {
        // 初始化過濾詞列表
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            const defaultFilters = [
                { id: 1, word: '垃圾', category: 'spam', enabled: true },
                { id: 2, word: '廣告', category: 'spam', enabled: true },
                { id: 3, word: '詐騙', category: 'fraud', enabled: true }
            ];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultFilters));
        }
        
        // 初始化過濾器開關（預設啟用）
        if (localStorage.getItem(this.FILTER_ENABLED_KEY) === null) {
            localStorage.setItem(this.FILTER_ENABLED_KEY, 'true');
        }
        
        // 初始化過濾統計
        if (!localStorage.getItem(this.FILTER_STATS_KEY)) {
            localStorage.setItem(this.FILTER_STATS_KEY, JSON.stringify({
                totalBlocked: 0,
                blockedByCategory: {},
                lastBlocked: null
            }));
        }
    },
    
    // 獲取過濾詞列表
    getFilters() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('讀取過濾詞失敗:', error);
            return [];
        }
    },
    
    // 保存過濾詞列表
    saveFilters(filters) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filters));
        } catch (error) {
            console.error('保存過濾詞失敗:', error);
        }
    },
    
    // 添加過濾詞
    addFilter(word, category = 'general') {
        const filters = this.getFilters();
        const newId = filters.length > 0 ? Math.max(...filters.map(f => f.id)) + 1 : 1;
        
        filters.push({
            id: newId,
            word: word.trim(),
            category: category,
            enabled: true
        });
        
        this.saveFilters(filters);
        return newId;
    },
    
    // 刪除過濾詞
    removeFilter(id) {
        const filters = this.getFilters();
        const filtered = filters.filter(f => f.id !== id);
        this.saveFilters(filtered);
        return filtered.length < filters.length;
    },
    
    // 更新過濾詞
    updateFilter(id, updates) {
        const filters = this.getFilters();
        const index = filters.findIndex(f => f.id === id);
        
        if (index !== -1) {
            filters[index] = { ...filters[index], ...updates };
            this.saveFilters(filters);
            return true;
        }
        return false;
    },
    
    // 檢查過濾器是否啟用
    isEnabled() {
        return localStorage.getItem(this.FILTER_ENABLED_KEY) === 'true';
    },
    
    // 設置過濾器開關
    setEnabled(enabled) {
        localStorage.setItem(this.FILTER_ENABLED_KEY, enabled.toString());
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
    }
};

// 自動初始化
ContentFilter.init();

