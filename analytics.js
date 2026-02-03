// ============================================
// 網站瀏覽量追蹤系統
// ============================================

const Analytics = {
    STORAGE_KEY: 'siteAnalytics',
    MAX_RECORDS: 10000, // 最多保存 10000 條記錄
    
    // 初始化
    init() {
        this.ensureStorage();
    },
    
    // 確保存儲結構存在
    ensureStorage() {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                totalViews: 0,
                dailyViews: {},
                pageViews: {},
                records: [],
                lastCleanup: new Date().toISOString().split('T')[0]
            }));
        }
    },
    
    // 獲取存儲數據
    getData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('讀取統計數據失敗:', error);
            this.ensureStorage();
            return this.getData();
        }
    },
    
    // 保存數據
    saveData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('保存統計數據失敗:', error);
            // 如果存儲空間不足，清理舊數據
            if (error.name === 'QuotaExceededError') {
                this.cleanupOldRecords();
                this.saveData(data);
            }
        }
    },
    
    // 追蹤頁面訪問
    trackPageView(options = {}) {
        const data = this.getData();
        if (!data) return;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toISOString();
        const path = options.path || window.location.pathname;
        const referrer = options.referrer || document.referrer || 'direct';
        const userAgent = options.userAgent || navigator.userAgent || '';
        
        // 檢查今天是否已經記錄過（去重）
        const todayKey = `${dateStr}_${this.getUserFingerprint()}`;
        const lastView = sessionStorage.getItem('lastPageView');
        
        if (lastView === path) {
            // 同一頁面短時間內不重複計算
            return;
        }
        
        // 記錄訪問
        const record = {
            timestamp: timeStr,
            date: dateStr,
            path: path,
            referrer: referrer,
            userAgent: userAgent,
            hour: now.getHours()
        };
        
        // 添加到記錄列表
        data.records.push(record);
        
        // 限制記錄數量
        if (data.records.length > this.MAX_RECORDS) {
            data.records = data.records.slice(-this.MAX_RECORDS);
        }
        
        // 更新總瀏覽量
        data.totalViews = (data.totalViews || 0) + 1;
        
        // 更新每日瀏覽量
        if (!data.dailyViews[dateStr]) {
            data.dailyViews[dateStr] = 0;
        }
        data.dailyViews[dateStr] += 1;
        
        // 更新頁面瀏覽量
        if (!data.pageViews[path]) {
            data.pageViews[path] = 0;
        }
        data.pageViews[path] += 1;
        
        // 保存數據
        this.saveData(data);
        
        // 記錄到 sessionStorage 防止重複計算
        sessionStorage.setItem('lastPageView', path);
        sessionStorage.setItem('lastViewTime', timeStr);
        
        // 定期清理舊數據
        this.cleanupOldRecordsIfNeeded();
    },
    
    // 獲取用戶指紋（簡單版本，用於去重）
    getUserFingerprint() {
        // 使用簡單的組合來識別用戶
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        // 簡單的 hash
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    },
    
    // 清理舊記錄（保留最近 90 天）
    cleanupOldRecordsIfNeeded() {
        const data = this.getData();
        if (!data) return;
        
        const today = new Date();
        const lastCleanup = new Date(data.lastCleanup || '2000-01-01');
        const daysSinceCleanup = Math.floor((today - lastCleanup) / (1000 * 60 * 60 * 24));
        
        // 每 7 天清理一次
        if (daysSinceCleanup >= 7) {
            this.cleanupOldRecords();
        }
    },
    
    // 清理舊記錄
    cleanupOldRecords() {
        const data = this.getData();
        if (!data) return;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // 保留 90 天
        
        // 清理記錄
        data.records = data.records.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= cutoffDate;
        });
        
        // 清理每日統計（保留最近 90 天）
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        Object.keys(data.dailyViews).forEach(date => {
            if (date < cutoffDateStr) {
                delete data.dailyViews[date];
            }
        });
        
        data.lastCleanup = new Date().toISOString().split('T')[0];
        this.saveData(data);
    },
    
    // 獲取統計數據
    getStats() {
        const data = this.getData();
        if (!data) {
            return {
                totalViews: 0,
                todayViews: 0,
                weekViews: 0,
                monthViews: 0,
                pageViews: {},
                dailyViews: {}
            };
        }
        
        const today = new Date().toISOString().split('T')[0];
        const todayDate = new Date();
        const weekAgo = new Date(todayDate);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(todayDate);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        // 計算今日瀏覽量
        const todayViews = data.dailyViews[today] || 0;
        
        // 計算本週瀏覽量
        let weekViews = 0;
        Object.keys(data.dailyViews).forEach(date => {
            const dateObj = new Date(date);
            if (dateObj >= weekAgo) {
                weekViews += data.dailyViews[date];
            }
        });
        
        // 計算本月瀏覽量
        let monthViews = 0;
        Object.keys(data.dailyViews).forEach(date => {
            const dateObj = new Date(date);
            if (dateObj >= monthAgo) {
                monthViews += data.dailyViews[date];
            }
        });
        
        // 獲取訪問時間分布（24小時）
        const hourDistribution = {};
        for (let i = 0; i < 24; i++) {
            hourDistribution[i] = 0;
        }
        data.records.forEach(record => {
            if (record.hour !== undefined) {
                hourDistribution[record.hour] = (hourDistribution[record.hour] || 0) + 1;
            }
        });
        
        return {
            totalViews: data.totalViews || 0,
            todayViews: todayViews,
            weekViews: weekViews,
            monthViews: monthViews,
            pageViews: data.pageViews || {},
            dailyViews: data.dailyViews || {},
            hourDistribution: hourDistribution,
            records: data.records || []
        };
    },
    
    // 獲取最近 N 天的每日瀏覽量數據（用於圖表）
    getDailyViewsForChart(days = 30) {
        const data = this.getData();
        if (!data) return [];
        
        const today = new Date();
        const result = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                views: data.dailyViews[dateStr] || 0
            });
        }
        
        return result;
    },
    
    // 匯出數據為 CSV
    exportToCSV() {
        const data = this.getData();
        if (!data || !data.records.length) {
            return '';
        }
        
        const headers = ['時間', '日期', '頁面', '來源', '時段'];
        const rows = data.records.map(record => [
            record.timestamp,
            record.date,
            record.path,
            record.referrer,
            record.hour + ':00'
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        return csv;
    },
    
    // 匯出數據為 JSON
    exportToJSON() {
        const data = this.getData();
        return JSON.stringify(data, null, 2);
    },
    
    // 重置所有數據
    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.ensureStorage();
    }
};

// 自動初始化
Analytics.init();

// 在頁面載入時追蹤訪問
if (typeof window !== 'undefined') {
    // 等待 DOM 載入完成後追蹤
    const trackPageView = () => {
        // 先記錄到本地（備用）
        Analytics.trackPageView();
        
        // 同時發送到後端 API（如果可用）
        const API_ENDPOINT = 'https://oldfish-profile.vercel.app/api/track-visit';
        const useAPI = API_ENDPOINT.includes('YOUR_API_URL') === false;
        
        if (useAPI) {
            // 異步發送，不阻塞頁面載入
            fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: window.location.pathname,
                    referrer: document.referrer || '直接訪問'
                })
            }).catch(error => {
                // 靜默失敗，不影響用戶體驗
                console.debug('訪問追蹤 API 調用失敗（可忽略）:', error);
            });
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackPageView);
    } else {
        trackPageView();
    }
}

