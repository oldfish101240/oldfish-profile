// 更新系統配置 API 端點（寫入 GitHub Issues）
// 使用一個特殊的 Issue 來存儲配置
//
// 使用方法：
// POST /api/update-config
// Body: { whisperEnabled: true/false, filterEnabled: true/false, filters: [...] }

export default async function handler(req, res) {
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
        const { whisperEnabled, filterEnabled, filters } = req.body;

        const repoOwner = 'oldfish101240';
        const repoName = 'whisper-box';
        const githubToken = process.env.GITHUB_TOKEN;

        if (!githubToken) {
            return res.status(500).json({ error: 'GitHub token not configured' });
        }

        // 查找現有的配置 Issue
        const searchUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?labels=system-config&state=all&per_page=1`;
        const headers = {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        const searchResponse = await fetch(searchUrl, { headers });
        if (!searchResponse.ok) {
            throw new Error('Failed to search config issue');
        }

        const existingIssues = await searchResponse.json();
        
        // 準備配置數據
        const config = {
            whisperEnabled: whisperEnabled !== undefined ? whisperEnabled : true,
            filterEnabled: filterEnabled !== undefined ? filterEnabled : true,
            filters: Array.isArray(filters) ? filters : []
        };

        const configJson = JSON.stringify(config, null, 2);
        const issueBody = `## 系統配置

此 Issue 用於存儲網站系統配置，請勿手動修改。

\`\`\`json
${configJson}
\`\`\`

---
*此配置由管理後台自動更新*`;

        if (existingIssues && existingIssues.length > 0) {
            // 更新現有的 Issue
            const issueNumber = existingIssues[0].number;
            const updateUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`;
            
            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    body: issueBody
                })
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.message || 'Failed to update config');
            }

            return res.status(200).json({
                success: true,
                updated: true,
                issueNumber: issueNumber
            });
        } else {
            // 創建新的配置 Issue
            const createUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/issues`;
            
            const createResponse = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'SYSTEM_CONFIG',
                    body: issueBody,
                    labels: ['system-config']
                })
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error(errorData.message || 'Failed to create config');
            }

            const issueData = await createResponse.json();

            return res.status(200).json({
                success: true,
                created: true,
                issueNumber: issueData.number
            });
        }

    } catch (error) {
        console.error('Error updating config:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

