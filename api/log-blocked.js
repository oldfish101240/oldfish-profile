// 內容攔截紀錄 API 端點（將前端偵測到的不當內容寫入 GitHub Issues）
// 部署到 Vercel、Netlify Functions 或其他 serverless 平台
//
// 環境變數：
// GITHUB_TOKEN: GitHub Personal Access Token (需要 repo 權限)
//
// 使用方法：
// POST /api/log-blocked
// Body: { path, name, message, matches: [{word, category}] }

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
        const { path, name, message, matches } = req.body || {};

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Missing message' });
        }

        const repoOwner = 'oldfish101240';
        const repoName = 'whisper-box';
        const githubToken = process.env.GITHUB_TOKEN;

        if (!githubToken) {
            return res.status(200).json({
                success: true,
                logged: false,
                message: 'GitHub token not configured'
            });
        }

        // IP + 地理資訊（沿用 track-visit 作法）
        const forwarded =
            req.headers['x-vercel-forwarded-for'] ||
            req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            '';
        const clientIPRaw =
            (Array.isArray(forwarded) ? forwarded[0] : String(forwarded))
                .split(',')[0]
                .trim() ||
            req.connection?.remoteAddress ||
            'unknown';
        const clientIP = clientIPRaw.replace('::ffff:', '');

        const userAgent = req.headers['user-agent'] || 'unknown';

        let country = '未知';
        let region = '未知';
        let city = '未知';

        try {
            const isPrivate =
                !clientIP ||
                clientIP === 'unknown' ||
                clientIP.startsWith('127.') ||
                clientIP.startsWith('192.168.') ||
                clientIP.startsWith('10.') ||
                clientIP === '::1' ||
                clientIP.startsWith('fc') ||
                clientIP.startsWith('fd');

            if (!isPrivate) {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                const geoResponse = await fetch(
                    `http://ip-api.com/json/${encodeURIComponent(clientIP)}?fields=status,country,regionName,city`,
                    { signal: controller.signal }
                );
                clearTimeout(timeout);

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
            // 靜默失敗
        }

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toISOString();

        const words = Array.isArray(matches) ? matches.map(m => m?.word).filter(Boolean) : [];
        const wordsText = words.length ? words.join('、') : '未知';

        const issueTitle = `攔截紀錄：${dateStr} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}（${wordsText}）`;
        const issueBody = `## 內容攔截紀錄

**時間：** ${timeStr}
**頁面：** ${path || '/'}
**姓名：** ${name || '未提供'}
**觸發詞：** ${wordsText}
**IP：** ${clientIP}
**國家/地區：** ${country}
**區域：** ${region}
**城市：** ${city}
**用戶代理：** ${userAgent}

---

**被攔截內容：**

${message}

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
                labels: ['analytics', 'blocked-content']
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to log blocked content');
        }

        const issueData = await response.json();

        return res.status(200).json({
            success: true,
            logged: true,
            issueNumber: issueData.number,
            issueUrl: issueData.html_url
        });
    } catch (error) {
        console.error('Error logging blocked content:', error);
        return res.status(200).json({
            success: true,
            logged: false,
            error: error.message || 'Internal server error'
        });
    }
}



