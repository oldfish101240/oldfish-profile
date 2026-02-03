// GitHub Issues API 代理端點 - 刪除 Issue（關閉並清空內容）
// 部署到 Vercel、Netlify Functions 或其他 serverless 平台
//
// 環境變數：
// GITHUB_TOKEN: GitHub Personal Access Token (需要 repo 權限)
//
// 使用方法：
// POST /api/delete-issue
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
        
        // 先獲取 Issue 的當前狀態
        const getResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!getResponse.ok) {
            const errorData = await getResponse.json();
            throw new Error(errorData.message || 'Failed to fetch issue');
        }
        
        // 刪除 Issue：關閉並清空標題和內容
        const deleteResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                state: 'closed',
                title: '[已刪除]',
                body: '*此訊息已被刪除*'
            })
        });
        
        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            throw new Error(errorData.message || 'Failed to delete issue');
        }
        
        const issueData = await deleteResponse.json();
        
        return res.status(200).json({
            success: true,
            issueNumber: issueData.number,
            state: issueData.state,
            message: 'Issue 已成功刪除'
        });
        
    } catch (error) {
        console.error('Error deleting issue:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}


