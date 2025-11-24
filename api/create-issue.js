// GitHub Issues API 代理端點
// 部署到 Vercel、Netlify Functions 或其他 serverless 平台
// 
// 環境變數：
// GITHUB_TOKEN: GitHub Personal Access Token (需要 repo 權限)
//
// 使用方法：
// 1. 部署到 Vercel: vercel
// 2. 設置環境變數 GITHUB_TOKEN
// 3. 更新前端代碼中的 API_ENDPOINT

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
        const { name, email, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const repoOwner = 'oldfish101240';
        const repoName = 'whisper-box';
        const githubToken = process.env.GITHUB_TOKEN;
        
        if (!githubToken) {
            return res.status(500).json({ error: 'GitHub token not configured' });
        }
        
        // 創建 GitHub Issue
        const issueTitle = `悄悄話：來自 ${name}`;
        const issueBody = `## 悄悄話訊息

**姓名：** ${name}
**Email：** ${email}
**時間：** ${new Date().toLocaleString('zh-TW')}

---

**訊息內容：**

${message}

---

*此訊息由網站表單自動提交*`;

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
                labels: ['whisper', '自動提交']
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create issue');
        }
        
        const issueData = await response.json();
        
        return res.status(200).json({
            success: true,
            issueNumber: issueData.number,
            issueUrl: issueData.html_url
        });
        
    } catch (error) {
        console.error('Error creating issue:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

