// 獲取系統配置 API 端點（從 GitHub Issues 讀取）
// 使用一個特殊的 Issue 來存儲配置
//
// 使用方法：
// GET /api/get-config

export default async function handler(req, res) {
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

        // 查找標題為 "SYSTEM_CONFIG" 的 Issue
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?labels=system-config&state=all&per_page=1&sort=created&direction=desc`;

        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (githubToken) headers['Authorization'] = `token ${githubToken}`;

        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error('Failed to fetch config');
        }

        const issues = await response.json();
        
        // 預設配置
        const defaultConfig = {
            whisperEnabled: true,
            filterEnabled: true,
            filters: [
                { id: 1, word: '垃圾', category: 'spam', enabled: true },
                { id: 2, word: '廣告', category: 'spam', enabled: true },
                { id: 3, word: '詐騙', category: 'fraud', enabled: true }
            ]
        };

        if (!issues || issues.length === 0) {
            // 如果沒有配置 Issue，返回預設值
            return res.status(200).json({
                success: true,
                config: defaultConfig
            });
        }

        const configIssue = issues[0];
        const body = configIssue.body || '';

        // 從 Issue body 中解析 JSON 配置
        // 格式：```json\n{...}\n```
        const jsonMatch = body.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch) {
            try {
                const config = JSON.parse(jsonMatch[1]);
                return res.status(200).json({
                    success: true,
                    config: { ...defaultConfig, ...config }
                });
            } catch (parseError) {
                console.error('解析配置 JSON 失敗:', parseError);
            }
        }

        // 如果解析失敗，返回預設值
        return res.status(200).json({
            success: true,
            config: defaultConfig
        });

    } catch (error) {
        console.error('Error fetching config:', error);
        // 即使出錯也返回預設配置，確保網站能正常運作
        return res.status(200).json({
            success: true,
            config: {
                whisperEnabled: true,
                filterEnabled: true,
                filters: [
                    { id: 1, word: '垃圾', category: 'spam', enabled: true },
                    { id: 2, word: '廣告', category: 'spam', enabled: true },
                    { id: 3, word: '詐騙', category: 'fraud', enabled: true }
                ]
            }
        });
    }
}

