// GitHub Issues API 代理端點 - 關閉 Issue（標記為已讀）
// 部署到 Vercel、Netlify Functions 或其他 serverless 平台
//
// 環境變數：
// GITHUB_TOKEN: GitHub Personal Access Token (需要 repo 權限)
//
// 使用方法：
// POST /api/close-issue
// Body: { issueNumber: 123 }

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
        const { issueNumber } = req.body;
        
        if (!issueNumber) {
            return res.status(400).json({ error: 'Missing issueNumber' });
        }
        
        const repoOwner = 'oldfish101240';
        const repoName = 'whisper-box'; //悄悄話專用 repo 名稱
        const githubToken = process.env.GITHUB_TOKEN;
        
        if (!githubToken) {
            return res.status(500).json({ error: 'GitHub token not configured' });
        }
        
        // 關閉 GitHub Issue
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                state: 'closed'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to close issue');
        }
        
        const issueData = await response.json();
        
        return res.status(200).json({
            success: true,
            issueNumber: issueData.number,
            state: issueData.state
        });
        
    } catch (error) {
        console.error('Error closing issue:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

