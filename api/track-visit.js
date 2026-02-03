// 網站訪問追蹤 API 端點
// 部署到 Vercel、Netlify Functions 或其他 serverless 平台
//
// 環境變數：
// GITHUB_TOKEN: GitHub Personal Access Token (需要 repo 權限)
//
// 使用方法：
// POST /api/track-visit
// Body: { path: "/index.html", referrer: "https://example.com" }

export default async function handler(req, res) {
    // 設置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { path, referrer } = req.body;
        
        // 獲取客戶端 IP 地址
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                        req.headers['x-real-ip'] || 
                        req.connection?.remoteAddress || 
                        'unknown';
        
        // 獲取用戶代理
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        // 獲取國家/地區信息（使用免費的 IP 地理位置 API）
        let country = '未知';
        let region = '未知';
        let city = '未知';
        
        try {
            // 使用 ip-api.com（免費，無需 API key，但有速率限制）
            // 如果 IP 是 localhost 或私有 IP，跳過查詢
            if (clientIP && clientIP !== 'unknown' && !clientIP.startsWith('127.') && !clientIP.startsWith('192.168.') && !clientIP.startsWith('10.')) {
                const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,countryCode,regionName,city,timezone`, {
                    timeout: 3000 // 3秒超時
                });
                
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (geoData.status === 'success') {
                        country = geoData.country || '未知';
                        region = geoData.regionName || '未知';
                        city = geoData.city || '未知';
                    }
                }
            }
        } catch (geoError) {
            console.warn('獲取地理位置失敗:', geoError);
            // 繼續執行，使用預設值
        }
        
        const repoOwner = 'oldfish101240';
        const repoName = 'whisper-box'; // 使用同一個 repo，或創建新的 analytics repo
        const githubToken = process.env.GITHUB_TOKEN;
        
        if (!githubToken) {
            // 如果沒有 token，返回成功但不記錄（避免前端錯誤）
            return res.status(200).json({
                success: true,
                tracked: false,
                message: 'GitHub token not configured'
            });
        }
        
        // 創建 GitHub Issue 來記錄訪問（使用 label 區分）
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toISOString();
        
        const issueTitle = `訪問記錄：${dateStr} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const issueBody = `## 網站訪問記錄

**時間：** ${timeStr}
**頁面：** ${path || '/'}
**來源：** ${referrer || '直接訪問'}
**IP：** ${clientIP}
**國家/地區：** ${country}
**區域：** ${region}
**城市：** ${city}
**用戶代理：** ${userAgent}

---
*此記錄由網站自動生成*`;

        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody,
                labels: ['analytics', 'visit-track']
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to track visit');
        }
        
        const issueData = await response.json();
        
        return res.status(200).json({
            success: true,
            tracked: true,
            issueNumber: issueData.number,
            country: country,
            region: region,
            city: city
        });
        
    } catch (error) {
        console.error('Error tracking visit:', error);
        // 即使出錯也返回成功，避免影響用戶體驗
        return res.status(200).json({
            success: true,
            tracked: false,
            error: error.message || 'Internal server error'
        });
    }
}

