// 獲取網站訪問統計 API 端點
// 部署到 Vercel、Netlify Functions 或其他 serverless 平台
//
// 環境變數：
// GITHUB_TOKEN: GitHub Personal Access Token (可選，但建議設置)
//
// 使用方法：
// GET /api/get-visits

export default async function handler(req, res) {
    // 設置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const repoOwner = 'oldfish101240';
        const repoName = 'whisper-box';
        const githubToken = process.env.GITHUB_TOKEN;
        
        // 讀取所有訪問記錄（使用 label 過濾）
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?labels=analytics,visit-track&state=all&per_page=100&sort=created&direction=desc`;
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
        }
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
            throw new Error('Failed to fetch visits');
        }
        
        const issues = await response.json();
        
        // 解析訪問記錄
        const visits = issues.map(issue => {
            const body = issue.body || '';
            
            // 解析 Issue body 中的信息
            const timeMatch = body.match(/\*\*時間：\*\* (.+)/);
            const pathMatch = body.match(/\*\*頁面：\*\* (.+)/);
            const referrerMatch = body.match(/\*\*來源：\*\* (.+)/);
            const ipMatch = body.match(/\*\*IP：\*\* (.+)/);
            const countryMatch = body.match(/\*\*國家\/地區：\*\* (.+)/);
            const regionMatch = body.match(/\*\*區域：\*\* (.+)/);
            const cityMatch = body.match(/\*\*城市：\*\* (.+)/);
            
            return {
                id: issue.number,
                timestamp: timeMatch ? timeMatch[1].trim() : issue.created_at,
                date: issue.created_at.split('T')[0],
                path: pathMatch ? pathMatch[1].trim() : '/',
                referrer: referrerMatch ? referrerMatch[1].trim() : '直接訪問',
                ip: ipMatch ? ipMatch[1].trim() : 'unknown',
                country: countryMatch ? countryMatch[1].trim() : '未知',
                region: regionMatch ? regionMatch[1].trim() : '未知',
                city: cityMatch ? cityMatch[1].trim() : '未知',
                issueUrl: issue.html_url,
                issueNumber: issue.number
            };
        });
        
        // 計算統計數據
        const today = new Date().toISOString().split('T')[0];
        const todayDate = new Date();
        const weekAgo = new Date(todayDate);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(todayDate);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        // 每日瀏覽量
        const dailyViews = {};
        visits.forEach(visit => {
            const date = visit.date;
            dailyViews[date] = (dailyViews[date] || 0) + 1;
        });
        
        // 頁面瀏覽量
        const pageViews = {};
        visits.forEach(visit => {
            const path = visit.path;
            pageViews[path] = (pageViews[path] || 0) + 1;
        });
        
        // 國家/地區統計
        const countryStats = {};
        visits.forEach(visit => {
            const country = visit.country;
            countryStats[country] = (countryStats[country] || 0) + 1;
        });
        
        // 訪問時間分布
        const hourDistribution = {};
        for (let i = 0; i < 24; i++) {
            hourDistribution[i] = 0;
        }
        visits.forEach(visit => {
            try {
                const date = new Date(visit.timestamp);
                const hour = date.getHours();
                hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
            } catch (e) {
                // 忽略日期解析錯誤
            }
        });
        
        // 計算今日/本週/本月瀏覽量
        const todayViews = dailyViews[today] || 0;
        
        let weekViews = 0;
        Object.keys(dailyViews).forEach(date => {
            const dateObj = new Date(date);
            if (dateObj >= weekAgo) {
                weekViews += dailyViews[date];
            }
        });
        
        let monthViews = 0;
        Object.keys(dailyViews).forEach(date => {
            const dateObj = new Date(date);
            if (dateObj >= monthAgo) {
                monthViews += dailyViews[date];
            }
        });
        
        return res.status(200).json({
            success: true,
            totalViews: visits.length,
            todayViews: todayViews,
            weekViews: weekViews,
            monthViews: monthViews,
            visits: visits,
            dailyViews: dailyViews,
            pageViews: pageViews,
            countryStats: countryStats,
            hourDistribution: hourDistribution
        });
        
    } catch (error) {
        console.error('Error fetching visits:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

